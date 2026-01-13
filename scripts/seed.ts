import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import pkg from 'pg';
import albums, { type SeedDay } from './seedData';

const { Pool } = pkg;

// Load environment variables for standalone script
config({ path: '.env.local' });
config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const seedDay = async (userId: string, { day, dayAlbums }: SeedDay) => {
  await prisma.dailyListen.create({
    data: {
      userId,
      date: new Date(`2026-01-${String(day).padStart(2, '0')}`),
      albums: {
        create: dayAlbums?.map(
          ({
            albumId,
            albumName,
            artistName,
            imageUrl,
            listenedInOrder,
            listenTime,
          }) => ({
            albumId,
            listenedInOrder: listenedInOrder || true,
            listenTime: listenTime || 'noon',
            albumName,
            artistNames: artistName,
            listenMethod: 'spotify',
            imageUrl,
          }),
        ),
      },
    },
  });
  console.log(
    `Inserted albums: ${dayAlbums.map((a) => a.albumName).join(', ')} for day ${day}`,
  );
};

async function main() {
  const userId = process.env.USER_ID as string;

  const daysToSeed = process.env.DAYS_TO_SEED?.split(',').map(Number);

  const albumsToSeed = daysToSeed
    ? albums.filter((album) => daysToSeed.includes(album.day))
    : albums;

  for (const day of albumsToSeed) {
    await seedDay(userId, day);
  }

  console.log(`✅ Created album listens from seed data.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
