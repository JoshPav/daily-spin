/**
 * Migration script to backfill missing album release dates
 *
 * This script fetches release dates for albums that don't have a releaseDate
 * stored in the database.
 *
 * Usage:
 *   bun run scripts/backfillReleaseDates.ts
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
  // Uses client credentials flow - no user auth needed for public endpoints
  return SpotifyApi.withClientCredentials(spotifyClientId, spotifyClientSecret);
}

// Simple rate limiter - Spotify allows ~180 requests per minute
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function backfillReleaseDates() {
  console.log('🔐 Setting up Spotify client (client credentials)...');
  const spotifyApi = getSpotifyClient();

  console.log('🔍 Fetching albums without release dates...\n');

  // Get all albums without a releaseDate
  const albumsWithoutReleaseDates = await prisma.album.findMany({
    where: {
      releaseDate: null,
    },
    select: {
      id: true,
      spotifyId: true,
      name: true,
    },
  });

  console.log(
    `Found ${albumsWithoutReleaseDates.length} albums without release dates\n`,
  );

  if (albumsWithoutReleaseDates.length === 0) {
    console.log(
      '✅ All albums already have release dates. Nothing to migrate.',
    );
    return;
  }

  let updatedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  // Spotify API allows fetching up to 20 albums at once
  const BATCH_SIZE = 20;

  for (let i = 0; i < albumsWithoutReleaseDates.length; i += BATCH_SIZE) {
    const batch = albumsWithoutReleaseDates.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(
      albumsWithoutReleaseDates.length / BATCH_SIZE,
    );

    console.log(
      `📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} albums)...`,
    );

    // Rate limit: wait 350ms between batches (~170 req/min)
    if (i > 0) {
      await sleep(350);
    }

    try {
      const spotifyAlbumIds = batch.map((a) => a.spotifyId);
      const spotifyAlbums = await spotifyApi.albums.get(spotifyAlbumIds);

      // Create a map of spotifyId -> releaseDate for quick lookup
      const releaseDateMap = new Map<string, string>();
      for (const album of spotifyAlbums) {
        if (album.release_date) {
          releaseDateMap.set(album.id, album.release_date);
        }
      }

      // Update each album in the batch
      for (const album of batch) {
        const releaseDate = releaseDateMap.get(album.spotifyId);

        if (!releaseDate) {
          console.log(`   ⚠️  No release date found for: ${album.name}`);
          notFoundCount++;
          continue;
        }

        if (isDryRun) {
          console.log(`   🔍 Would update: ${album.name} (${releaseDate})`);
          updatedCount++;
        } else {
          await prisma.album.update({
            where: { id: album.id },
            data: { releaseDate },
          });
          console.log(`   ✅ Updated: ${album.name} (${releaseDate})`);
          updatedCount++;
        }
      }
    } catch (error) {
      console.error(`   ❌ Error fetching batch:`, error);
      errorCount += batch.length;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('Migration Summary:');
  console.log('='.repeat(50));
  console.log(
    `Total albums without release dates: ${albumsWithoutReleaseDates.length}`,
  );
  console.log(`Updated: ${updatedCount}`);
  console.log(`No release date found on Spotify: ${notFoundCount}`);
  if (errorCount > 0) {
    console.log(`Errors: ${errorCount}`);
  }

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN - No changes were made to the database');
    console.log('Run without DRY_RUN=true to perform the actual migration');
  } else {
    console.log('\n✅ Migration complete!');
  }
}

backfillReleaseDates()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
