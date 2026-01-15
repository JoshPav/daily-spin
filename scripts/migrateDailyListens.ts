/**
 * Migration script for DailyListen schema normalization (#38, #42)
 *
 * This script copies data from the old DailyListen/AlbumListen tables
 * to the new normalized DailyListenNew/AlbumListenNew tables.
 *
 * What it does:
 * - Reads all existing DailyListen records with their AlbumListen children
 * - Fetches album details from Spotify API to get artist Spotify IDs
 * - Creates Album and Artist records with proper relations
 * - Creates DailyListenNew records with AlbumListenNew children that link to Album
 *
 * Usage:
 *   bun run scripts/migrateDailyListens.ts
 *
 * Options:
 *   DRY_RUN=true - Preview changes without writing to database
 *
 * Requirements:
 *   - SPOTIFY_CLIENT_ID in .env.local
 *   - SPOTIFY_CLIENT_SECRET in .env.local
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { config } from 'dotenv';
import pkg from 'pg';

const { Pool } = pkg;

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const isDryRun = process.env.DRY_RUN === 'true';
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!spotifyClientId || !spotifyClientSecret) {
  console.error(
    '❌ SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required in .env.local',
  );
  process.exit(1);
}

function getSpotifyClient() {
  // Uses client credentials flow - no user auth needed for public endpoints like albums
  return SpotifyApi.withClientCredentials(spotifyClientId, spotifyClientSecret);
}

// Simple rate limiter - Spotify allows ~180 requests per minute
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findOrCreateArtist(artist: {
  spotifyId: string;
  name: string;
  imageUrl?: string;
}) {
  return await prisma.artist.upsert({
    where: { spotifyId: artist.spotifyId },
    update: {
      name: artist.name,
      imageUrl: artist.imageUrl,
    },
    create: {
      spotifyId: artist.spotifyId,
      name: artist.name,
      imageUrl: artist.imageUrl,
    },
  });
}

async function findOrCreateAlbum(albumData: {
  spotifyId: string;
  name: string;
  imageUrl: string;
  artists: { spotifyId: string; name: string; imageUrl?: string }[];
}) {
  // Check if album already exists
  const existing = await prisma.album.findUnique({
    where: { spotifyId: albumData.spotifyId },
    include: { artists: { include: { artist: true } } },
  });

  if (existing) {
    return existing;
  }

  // Create or find all artists first
  const artists = await Promise.all(
    albumData.artists.map((artist) => findOrCreateArtist(artist)),
  );

  // Create album with artist relations
  return await prisma.album.create({
    data: {
      spotifyId: albumData.spotifyId,
      name: albumData.name,
      imageUrl: albumData.imageUrl,
      artists: {
        create: artists.map((artist, index) => ({
          artistId: artist.id,
          order: index,
        })),
      },
    },
    include: { artists: { include: { artist: true } } },
  });
}

// Cache for fetched albums to avoid duplicate API calls
const albumCache = new Map<
  string,
  { name: string; imageUrl: string; artists: { id: string; name: string }[] }
>();

async function fetchAlbumFromSpotify(
  spotifyApi: SpotifyApi,
  albumId: string,
): Promise<{
  name: string;
  imageUrl: string;
  artists: { spotifyId: string; name: string }[];
} | null> {
  // Check cache first
  const cached = albumCache.get(albumId);
  if (cached) {
    return {
      name: cached.name,
      imageUrl: cached.imageUrl,
      artists: cached.artists.map((a) => ({ spotifyId: a.id, name: a.name })),
    };
  }

  try {
    const album = await spotifyApi.albums.get(albumId);

    const result = {
      name: album.name,
      imageUrl: album.images[0]?.url ?? '',
      artists: album.artists.map((a) => ({ id: a.id, name: a.name })),
    };

    // Cache the result
    albumCache.set(albumId, result);

    return {
      name: result.name,
      imageUrl: result.imageUrl,
      artists: result.artists.map((a) => ({ spotifyId: a.id, name: a.name })),
    };
  } catch (error) {
    console.warn(`   ⚠️  Failed to fetch album ${albumId} from Spotify:`, error);
    return null;
  }
}

async function migrateListens() {
  console.log('🔐 Setting up Spotify client (client credentials)...');
  const spotifyApi = getSpotifyClient();

  console.log('🔍 Fetching existing DailyListen records...\n');

  // Get all existing daily listens with their albums
  const oldListens = await prisma.dailyListenOld.findMany({
    include: {
      albums: true,
    },
    where: {
      date: '2026-01-06T00:00:00.000Z',
    },
    orderBy: {
      date: 'asc',
    },
  });

  console.log(`Found ${oldListens.length} DailyListen records to migrate\n`);

  if (oldListens.length === 0) {
    console.log('Nothing to migrate.');
    return;
  }

  let migratedCount = 0;
  let skippedCount = 0;
  let albumsCreated = 0;
  let albumsReused = 0;
  let artistsCreated = 0;
  let spotifyFetchErrors = 0;
  let requestCount = 0;

  for (const oldListen of oldListens) {
    const dateStr = oldListen.date.toISOString().split('T')[0];

    // Check if already migrated
    const existingNew = await prisma.dailyListen.findUnique({
      where: {
        userId_date: {
          userId: oldListen.userId,
          date: oldListen.date,
        },
      },
    });

    if (existingNew) {
      console.log(`⏭️  Skipping ${dateStr} - already migrated`);
      skippedCount++;
      continue;
    }

    console.log(
      `📅 Migrating ${dateStr} (${oldListen.albums.length} albums)...`,
    );

    if (isDryRun) {
      for (const album of oldListen.albums) {
        console.log(`   - ${album.albumName} by ${album.artistNames}`);
      }
      migratedCount++;
      continue;
    }

    // Build album listen data with proper album records
    const albumListenData: {
      albumId: string;
      listenOrder: (typeof oldListen.albums)[0]['listenOrder'];
      listenMethod: (typeof oldListen.albums)[0]['listenMethod'];
      listenTime: (typeof oldListen.albums)[0]['listenTime'];
    }[] = [];

    for (const oldAlbum of oldListen.albums) {
      // Check if album already exists in database
      const existingAlbum = await prisma.album.findUnique({
        where: { spotifyId: oldAlbum.albumId },
        include: { artists: true },
      });

      let album: Awaited<ReturnType<typeof findOrCreateAlbum>>;

      if (existingAlbum) {
        album = { ...existingAlbum, artists: [] };
        albumsReused++;
        console.log(`   ♻️  Reusing album: ${existingAlbum.name}`);
      } else {
        // Fetch from Spotify to get artist IDs
        // Rate limit: wait 350ms between requests (~170 req/min)
        if (requestCount > 0) {
          await sleep(350);
        }
        requestCount++;

        const spotifyData = await fetchAlbumFromSpotify(
          spotifyApi,
          oldAlbum.albumId,
        );

        if (spotifyData) {
          const artistCount = spotifyData.artists.length;
          album = await findOrCreateAlbum({
            spotifyId: oldAlbum.albumId,
            name: spotifyData.name,
            imageUrl: spotifyData.imageUrl,
            artists: spotifyData.artists,
          });
          albumsCreated++;
          artistsCreated += artistCount;
          console.log(
            `   ✨ Created album: ${album.name} (${artistCount} artist${artistCount > 1 ? 's' : ''})`,
          );
        } else {
          // Fallback: create album without artist relations
          spotifyFetchErrors++;
          album = await findOrCreateAlbum({
            spotifyId: oldAlbum.albumId,
            name: oldAlbum.albumName,
            imageUrl: oldAlbum.imageUrl,
            artists: [],
          });
          albumsCreated++;
          console.log(
            `   ⚠️  Created album without artists: ${album.name} (Spotify fetch failed)`,
          );
        }
      }

      albumListenData.push({
        albumId: album.id,
        listenOrder: oldAlbum.listenOrder,
        listenMethod: oldAlbum.listenMethod,
        listenTime: oldAlbum.listenTime,
      });
    }

    // Create the new DailyListenNew with AlbumListenNew children
    await prisma.dailyListen.create({
      data: {
        userId: oldListen.userId,
        date: oldListen.date,
        createdAt: oldListen.createdAt,
        updatedAt: oldListen.updatedAt,
        albums: {
          create: albumListenData,
        },
      },
    });

    console.log(`   ✅ Migrated ${oldListen.albums.length} album listens`);
    migratedCount++;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('Migration Summary:');
  console.log('='.repeat(50));
  console.log(`Total DailyListen records: ${oldListens.length}`);
  console.log(`Migrated: ${migratedCount}`);
  console.log(`Skipped (already migrated): ${skippedCount}`);
  console.log(`Albums created: ${albumsCreated}`);
  console.log(`Albums reused: ${albumsReused}`);
  console.log(`Artists created: ${artistsCreated}`);
  if (spotifyFetchErrors > 0) {
    console.log(`Spotify fetch errors: ${spotifyFetchErrors}`);
  }

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN - No changes were made to the database');
    console.log('Run without DRY_RUN=true to perform the actual migration');
  } else {
    console.log('\n✅ Migration complete!');
  }
}

migrateListens()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
