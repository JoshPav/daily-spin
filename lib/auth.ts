import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
// If your Prisma file is located elsewhere, you can change the path
import { config } from 'dotenv';
import prisma from '../server/clients/prisma';

config({ path: '.env.local' });

const spotifyClientID = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!spotifyClientID || !spotifyClientSecret) {
  throw new Error('Missing required env vars');
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  session: {
    cookieCache: {
      enabled: true,
      strategy: 'jwt',
    },
  },
  socialProviders: {
    spotify: {
      clientId: spotifyClientID,
      clientSecret: spotifyClientSecret,
      redirectURI: 'http://127.0.0.1:3000/api/auth/callback/spotify',
    },
  },
});
