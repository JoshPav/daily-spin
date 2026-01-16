import type { PrismaClient, User } from '@prisma/client';
import prisma from '../clients/prisma';
import { createTaggedLogger } from '../utils/logger';

const logger = createTaggedLogger('Repository:User');

type UserFeature = keyof Pick<
  User,
  | 'createSongOfDayPlaylist'
  | 'createTodaysAlbumPlaylist'
  | 'trackListeningHistory'
>;

export class UserRepository {
  constructor(private prismaClient: PrismaClient = prisma) {}

  async getUser(userId: string) {
    const startTime = Date.now();
    logger.debug('Fetching user', { userId });

    try {
      const result = await this.prismaClient.user.findUnique({
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

      const duration = Date.now() - startTime;
      if (duration > 100) {
        logger.warn('Slow query detected', {
          userId,
          operation: 'getUser',
          duration: `${duration}ms`,
        });
      }

      logger.debug('Successfully fetched user', {
        userId,
        found: !!result,
        hasSpotifyAccount: result ? result.accounts.length > 0 : false,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch user', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getUsersWithFeatureEnabled(feature: UserFeature) {
    const startTime = Date.now();
    logger.debug('Fetching users with feature enabled', { feature });

    try {
      const result = await this.prismaClient.user.findMany({
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

      const duration = Date.now() - startTime;
      if (duration > 100) {
        logger.warn('Slow query detected', {
          operation: 'getUsersWithFeatureEnabled',
          feature,
          duration: `${duration}ms`,
        });
      }

      logger.debug('Successfully fetched users with feature enabled', {
        feature,
        count: result.length,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch users with feature enabled', {
        feature,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async updateUserTokens(
    userId: string,
    tokens: {
      accessToken: string;
      accessTokenExpiresAt: Date;
      scope: string;
    },
  ) {
    logger.debug('Updating user tokens', {
      userId,
      expiresAt: tokens.accessTokenExpiresAt.toISOString(),
    });

    try {
      // Find the user's Spotify account
      const account = await this.prismaClient.account.findFirst({
        where: {
          userId,
          providerId: 'spotify',
        },
      });

      if (!account) {
        logger.error('Spotify account not found for user', { userId });
        throw new Error('Spotify account not found for user');
      }

      // Update the account with new tokens
      const result = await this.prismaClient.account.update({
        where: {
          id: account.id,
        },
        data: {
          accessToken: tokens.accessToken,
          accessTokenExpiresAt: tokens.accessTokenExpiresAt,
          scope: tokens.scope,
        },
      });

      logger.debug('Successfully updated user tokens', {
        userId,
        accountId: account.id,
        expiresAt: tokens.accessTokenExpiresAt.toISOString(),
      });

      return result;
    } catch (error) {
      logger.error('Failed to update user tokens', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
