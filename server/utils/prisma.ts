import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'
import pkg from 'pg'
const { Pool } = pkg

// Nuxt doesn't always load .env.local for server utils, so load it explicitly
config({ path: '.env.local' })
config({ path: '.env' })

const pool = new Pool({ connectionString: process.env.POSTGRES_URL })
const adapter = new PrismaPg(pool)

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
