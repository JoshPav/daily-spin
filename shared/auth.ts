import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from '../server/clients/prisma';

const clientId = process.env.SPOTIFY_CLIENT_ID || '';
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';

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
      clientId,
      clientSecret,
      scope: [
        'user-read-recently-played',
        'playlist-modify-public',
        'playlist-modify-private',
      ],
      redirectURI: 'http://127.0.0.1:3000/api/auth/callback/spotify',
    },
  },
});
