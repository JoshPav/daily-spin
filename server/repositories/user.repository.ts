import type { User } from '@prisma/client';
import prisma, { type ExtendedPrismaClient } from '../clients/prisma';
import { createTaggedLogger } from '../utils/logger';

const logger = createTaggedLogger('Repository:User');

type UserFeature = keyof Pick<
  User,
  | 'createSongOfDayPlaylist'
  | 'createTodaysAlbumPlaylist'
  | 'trackListeningHistory'
>;

export class UserRepository {
  constructor(private prismaClient: ExtendedPrismaClient = prisma) {}

  async getUser(userId: string) {
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
              accountId: true,
              accessToken: true,
              refreshToken: true,
              accessTokenExpiresAt: true,
              scope: true,
            },
          },
        },
      });

      logger.debug('Successfully fetched user', {
        userId,
        found: !!result,
        hasSpotifyAccount: result ? result.accounts.length > 0 : false,
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

      logger.debug('Successfully fetched users with feature enabled', {
        feature,
        count: result.length,
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

  async getPreferences(userId: string) {
    logger.debug('Fetching user preferences', { userId });

    try {
      const result = await this.prismaClient.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          trackListeningHistory: true,
          createTodaysAlbumPlaylist: true,
          createSongOfDayPlaylist: true,
          userPlaylists: {
            select: {
              playlistType: true,
              spotifyPlaylistId: true,
            },
          },
        },
      });

      logger.debug('Successfully fetched user preferences', {
        userId,
        found: !!result,
        playlistCount: result?.userPlaylists.length || 0,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch user preferences', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async updatePreferences(
    userId: string,
    preferences: {
      trackListeningHistory?: boolean;
      createTodaysAlbumPlaylist?: boolean;
      createSongOfDayPlaylist?: boolean;
    },
  ) {
    logger.debug('Updating user preferences', {
      userId,
      preferences,
    });

    try {
      const result = await this.prismaClient.user.update({
        where: {
          id: userId,
        },
        data: preferences,
        select: {
          trackListeningHistory: true,
          createTodaysAlbumPlaylist: true,
          createSongOfDayPlaylist: true,
          userPlaylists: {
            select: {
              playlistType: true,
              spotifyPlaylistId: true,
            },
          },
        },
      });

      logger.info('Successfully updated user preferences', {
        userId,
        updatedFields: Object.keys(preferences),
      });

      return result;
    } catch (error) {
      logger.error('Failed to update user preferences', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async setSpotifyRequiresReauth(userId: string, requiresReauth: boolean) {
    logger.info('Setting Spotify requiresReauth flag', {
      userId,
      requiresReauth,
    });

    try {
      const result = await this.prismaClient.account.updateMany({
        where: {
          userId,
          providerId: 'spotify',
        },
        data: {
          requiresReauth,
        },
      });

      logger.info('Successfully updated requiresReauth flag', {
        userId,
        requiresReauth,
        updatedCount: result.count,
      });

      return result;
    } catch (error) {
      logger.error('Failed to update requiresReauth flag', {
        userId,
        requiresReauth,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
