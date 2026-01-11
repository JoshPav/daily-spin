import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
// If your Prisma file is located elsewhere, you can change the path
import { config } from 'dotenv';
import prisma from '../clients/prisma';

config({ path: '.env.local' });

const spotifyClientID = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

console.log({ spotifyClientID, spotifyClientSecret });

if (!spotifyClientID || !spotifyClientSecret) {
  throw new Error('Missing required env vars');
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'sqlite', // or "mysql", "postgresql", ...etc
  }),
  socialProviders: {
    spotify: {
      clientId: spotifyClientID,
      clientSecret: spotifyClientSecret,
    },
  },
});
