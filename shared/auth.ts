import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { customSession } from 'better-auth/plugins';
import prisma from '../server/clients/prisma';

const clientId = process.env.SPOTIFY_CLIENT_ID || '';
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
const baseUrl = process.env.BASE_URL || '';

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
  account: {
    additionalFields: {
      requiresReauth: {
        type: 'boolean',
        defaultValue: false,
      },
    },
  },
  databaseHooks: {
    account: {
      update: {
        // Reset requiresReauth when account is updated with new tokens (re-authentication)
        before: async (account) => {
          if (account.accessToken || account.refreshToken) {
            return {
              data: {
                ...account,
                requiresReauth: false,
              },
            };
          }
        },
      },
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
      redirectURI: `${baseUrl}/api/auth/callback/spotify`,
    },
  },
  plugins: [
    customSession(async ({ user, session }) => {
      const spotifyAccount = await prisma.account.findFirst({
        where: {
          userId: user.id,
          providerId: 'spotify',
        },
        select: {
          requiresReauth: true,
        },
      });

      return {
        user,
        session,
        requiresReauth: spotifyAccount?.requiresReauth ?? false,
      };
    }),
  ],
});
