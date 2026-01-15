import type { PrismaClient, User } from '@prisma/client';
import prisma from '../clients/prisma';

type UserFeature = keyof Pick<
  User,
  | 'createSongOfDayPlaylist'
  | 'createTodaysAlbumPlaylist'
  | 'trackListeningHistory'
>;

export class UserRepository {
  constructor(private prismaClient: PrismaClient = prisma) {}

  async getUser(userId: string) {
    return await this.prismaClient.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        accounts: {
          where: {
            providerId: 'spotify',
          },
          select: {
            accessToken: true,
            refreshToken: true,
            accessTokenExpiresAt: true,
            scope: true,
          },
        },
      },
    });
  }

  async getUsersWithFeatureEnabled(feature: UserFeature) {
    return await this.prismaClient.user.findMany({
      where: {
        [feature]: true,
      },
      select: {
        id: true,
        accounts: {
          where: {
            providerId: 'spotify',
          },
          select: {
            accessToken: true,
            refreshToken: true,
            accessTokenExpiresAt: true,
            scope: true,
          },
        },
      },
    });
  }

  async updateUserTokens(
    userId: string,
    tokens: {
      accessToken: string;
      accessTokenExpiresAt: Date;
      scope: string;
    },
  ) {
    // Find the user's Spotify account
    const account = await this.prismaClient.account.findFirst({
      where: {
        userId,
        providerId: 'spotify',
      },
    });

    if (!account) {
      throw new Error('Spotify account not found for user');
    }

    // Update the account with new tokens
    return await this.prismaClient.account.update({
      where: {
        id: account.id,
      },
      data: {
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        scope: tokens.scope,
      },
    });
  }
}
