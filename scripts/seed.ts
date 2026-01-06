import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import pkg from 'pg';

const { Pool } = pkg;

// Load environment variables for standalone script
config({ path: '.env.local' });
config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing data
  await prisma.albumListen.deleteMany({});
  await prisma.dailyListen.deleteMany({});
  await prisma.user.deleteMany({});

  // Create a test user
  const user = await prisma.user.create({
    data: {},
  });

  console.log('✅ Created test user:', user.id);

  // Create real album listens for January 1-6, 2026
  const albums = [
    { day: 1, albumId: '2Htq1sHgmdGffojIBM6Q1s' },
    { day: 2, albumId: '6LoPmf1yQRQo4s9qwzDOaO' },
    { day: 3, albumId: '2kKc3Yid0YR3SSbeQ3x5kV' },
    { day: 4, albumId: '4gwfCCNRxAB1P62hlDCelM' },
    { day: 5, albumId: '0cgyeBU54kjmI54TflMANg' },
    { day: 6, albumId: '7CBK26TFXHyt2l6NQcXIsq' },
  ];

  for (const { day, albumId } of albums) {
    await prisma.dailyListen.create({
      data: {
        userId: user.id,
        date: new Date(`2026-01-${String(day).padStart(2, '0')}`),
        albums: {
          create: [{ albumId, listenedInOrder: true }],
        },
      },
    });
  }

  console.log('✅ Created album listens for January 1-6');
  console.log('\nTest User ID:', user.id);
  console.log('\nAdd this to your API file:');
  console.log(
    `const userId = '${user.id}' // TODO: Get from session once auth is set up`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
