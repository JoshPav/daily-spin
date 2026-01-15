import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pkg from 'pg';

const { Pool } = pkg;

let testPrisma: PrismaClient | null = null;
let pool: pkg.Pool | null = null;

export async function setupTestDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Make sure .env.test is loaded or set DATABASE_URL environment variable.',
    );
  }

  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);

  testPrisma = new PrismaClient({
    adapter,
    log: ['error'],
  });

  try {
    await testPrisma.$connect();
    console.log('✓ Test database connection established');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }

  return testPrisma;
}

export async function teardownTestDatabase() {
  if (testPrisma) {
    await testPrisma.$disconnect();
    console.log('✓ Test database connection closed');
    testPrisma = null;
  }
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function clearTestDatabase() {
  if (!testPrisma) {
    throw new Error('Test database not initialized');
  }

  try {
    // Use a transaction to ensure all deletions succeed or fail together
    // Order matters due to foreign key constraints
    await testPrisma.$transaction([
      testPrisma.albumListen.deleteMany(),
      testPrisma.dailyListen.deleteMany(),
      testPrisma.backlogItem.deleteMany(),
      testPrisma.albumArtist.deleteMany(),
      testPrisma.album.deleteMany(),
      testPrisma.artist.deleteMany(),
      testPrisma.user.deleteMany(),
    ]);
  } catch (error) {
    console.error('Failed to clear test database:', error);
    throw error;
  }
}

export function getTestPrisma() {
  if (!testPrisma) {
    throw new Error(
      'Test database not initialized. Call setupTestDatabase() first.',
    );
  }
  return testPrisma;
}
