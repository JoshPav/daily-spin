import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pkg from 'pg';
import { loggingExtension } from './prismaExtensions';

const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter }).$extends(loggingExtension);
};

export type ExtendedPrismaClient = ReturnType<typeof prismaClientSingleton>;

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
