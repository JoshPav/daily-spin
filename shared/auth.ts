import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { useRuntimeConfig } from 'nuxt/app';
import prisma from '../server/clients/prisma';

const config = useRuntimeConfig();

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
      clientId: config.spotifyClientId,
      clientSecret: config.spotifyClientSecret,
      scope: [
        'user-read-recently-played',
        'playlist-modify-public',
        'playlist-modify-private',
      ],
      redirectURI: `${config.baseUrl}/api/auth/callback/spotify`,
    },
  },
});
