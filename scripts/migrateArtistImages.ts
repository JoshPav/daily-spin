/**
 * Migration script to backfill missing artist images
 *
 * This script fetches images for artists that don't have an imageUrl
 * stored in the database.
 *
 * Usage:
 *   bun run scripts/migrateArtistImages.ts
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

async function migrateArtistImages() {
  console.log('🔐 Setting up Spotify client (client credentials)...');
  const spotifyApi = getSpotifyClient();

  console.log('🔍 Fetching artists without images...\n');

  // Get all artists without an imageUrl
  const artistsWithoutImages = await prisma.artist.findMany({
    where: {
      imageUrl: null,
    },
    select: {
      id: true,
      spotifyId: true,
      name: true,
    },
  });

  console.log(`Found ${artistsWithoutImages.length} artists without images\n`);

  if (artistsWithoutImages.length === 0) {
    console.log('✅ All artists already have images. Nothing to migrate.');
    return;
  }

  let updatedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  // Spotify API allows fetching up to 50 artists at once
  const BATCH_SIZE = 50;

  for (let i = 0; i < artistsWithoutImages.length; i += BATCH_SIZE) {
    const batch = artistsWithoutImages.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(artistsWithoutImages.length / BATCH_SIZE);

    console.log(
      `📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} artists)...`,
    );

    // Rate limit: wait 350ms between batches (~170 req/min)
    if (i > 0) {
      await sleep(350);
    }

    try {
      const spotifyArtistIds = batch.map((a) => a.spotifyId);
      const spotifyArtists = await spotifyApi.artists.get(spotifyArtistIds);

      // Create a map of spotifyId -> imageUrl for quick lookup
      const imageMap = new Map<string, string>();
      for (const artist of spotifyArtists) {
        const imageUrl = artist.images[0]?.url;
        if (imageUrl) {
          imageMap.set(artist.id, imageUrl);
        }
      }

      // Update each artist in the batch
      for (const artist of batch) {
        const imageUrl = imageMap.get(artist.spotifyId);

        if (!imageUrl) {
          console.log(`   ⚠️  No image found for: ${artist.name}`);
          notFoundCount++;
          continue;
        }

        if (isDryRun) {
          console.log(`   🔍 Would update: ${artist.name}`);
          updatedCount++;
        } else {
          await prisma.artist.update({
            where: { id: artist.id },
            data: { imageUrl },
          });
          console.log(`   ✅ Updated: ${artist.name}`);
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
  console.log(`Total artists without images: ${artistsWithoutImages.length}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`No image found on Spotify: ${notFoundCount}`);
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

migrateArtistImages()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
