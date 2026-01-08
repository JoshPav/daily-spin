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
    {
      day: 1,
      dayAlbums: [
        {
          albumName: 'Imaginal Disk',
          artistName: 'Magdalena Bay',
          imageUrl:
            'https://i.scdn.co/image/ab67616d0000b2737339f7e95927d4b823189f62',
          albumId: '2Htq1sHgmdGffojIBM6Q1s',
          listenedInOrder: true,
        },
      ],
    },
    {
      day: 2,
      dayAlbums: [
        {
          albumName: 'Purxst',
          artistName: 'Last Dinosaurs',
          imageUrl:
            'https://i.scdn.co/image/ab67616d0000b273884a6414f7c1dc14f791f7a7',
          albumId: '6LoPmf1yQRQo4s9qwzDOaO',
          listenedInOrder: true,
        },
      ],
    },
    {
      day: 3,
      dayAlbums: [
        {
          albumName: 'The Clearing',
          artistName: 'Wolf Alice',
          imageUrl:
            'https://i.scdn.co/image/ab67616d0000b273789ef6189aa0777e70bf50b4',
          albumId: '2kKc3Yid0YR3SSbeQ3x5kV',
          listenedInOrder: true,
        },
      ],
    },
    {
      day: 4,
      dayAlbums: [
        {
          albumName: 'People Watching (Deluxe Edition)',
          artistName: 'Sam Fender',
          imageUrl:
            'https://i.scdn.co/image/ab67616d0000b27370722c52a53ef4a56f0c2eb0',
          albumId: '4gwfCCNRxAB1P62hlDCelM',
          listenedInOrder: true,
        },
      ],
    },
    {
      day: 5,
      dayAlbums: [
        {
          albumName: 'Neon Pill',
          artistName: 'Cage The Elephant',
          imageUrl:
            'https://i.scdn.co/image/ab67616d0000b273479cf8279b8723c5988ab68f',
          albumId: '2dGlEut1TyhAyApZ0ADIsd',
          listenedInOrder: true,
        },
      ],
    },
    {
      day: 6,
      dayAlbums: [
        {
          albumName: 'Life Is Yours',
          artistName: 'Foals',
          imageUrl:
            'https://i.scdn.co/image/ab67616d0000b273408cece71a6d1cdcf2d4ad15',
          albumId: '2dGlEut1TyhAyApZ0ADIsd',
          listenedInOrder: true,
        },
      ],
    },
    {
      day: 7,
      dayAlbums: [
        {
          albumName: 'Rumours',
          artistName: 'Fleetwood Mac',
          imageUrl:
            'https://i.scdn.co/image/ab67616d0000b27357df7ce0eac715cf70e519a7',
          albumId: '1bt6q2SruMsBtcerNVtpZB',
          listenedInOrder: true,
        },
        {
          albumName: '"Heroes" (2017 Remaster)',
          artistName: 'David Bowie',
          imageUrl:
            'https://i.scdn.co/image/ab67616d0000b273204f41d52743c6a9efd62985',
          albumId: '4I5zzKYd2SKDgZ9DRf5LVk',
          listenedInOrder: true,
        },
        {
          albumName: 'hickey',
          artistName: 'Royel Otis',
          imageUrl:
            'https://i.scdn.co/image/ab67616d0000b2739ea7c8a96a35dc122fcbc621',
          albumId: '7iX7uCkSNnkuIMwbjl8Jpf',
          listenedInOrder: true,
        },
      ],
    },
    {
      day: 8,
      dayAlbums: [
        {
          albumName: 'Pacific Heavy Highway',
          artistName: 'Skegss',
          imageUrl:
            'https://i.scdn.co/image/ab67616d0000b273ece66bbdbbee3ee01b07afdd',
          albumId: '6CLRZuwn4WFgY4e1IsMcBq',
          listenedInOrder: false,
        },
      ],
    },
  ];

  for (const { day, dayAlbums } of albums) {
    await prisma.dailyListen.create({
      data: {
        userId: user.id,
        date: new Date(`2026-01-${String(day).padStart(2, '0')}`),
        albums: {
          create: dayAlbums?.map(
            ({
              albumId,
              albumName,
              artistName,
              imageUrl,
              listenedInOrder,
            }) => ({
              albumId,
              listenedInOrder: listenedInOrder || true,
              albumName,
              artistNames: artistName,
              imageUrl,
            }),
          ),
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
