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
}
