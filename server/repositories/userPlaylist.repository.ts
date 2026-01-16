import type { PlaylistType } from '@prisma/client';
import prisma, { type ExtendedPrismaClient } from '../clients/prisma';
import { createTaggedLogger } from '../utils/logger';

const logger = createTaggedLogger('Repository:UserPlaylist');

export class UserPlaylistRepository {
  constructor(private prismaClient: ExtendedPrismaClient = prisma) {}

  /**
   * Get user's playlist by type
   */
  async getByType(
    userId: string,
    playlistType: PlaylistType,
  ): Promise<{ spotifyPlaylistId: string } | null> {
    logger.debug('Fetching user playlist', { userId, playlistType });

    try {
      const playlist = await this.prismaClient.userPlaylist.findUnique({
        where: {
          userId_playlistType: { userId, playlistType },
        },
        select: {
          spotifyPlaylistId: true,
        },
      });

      logger.debug('Successfully fetched user playlist', {
        userId,
        playlistType,
        found: !!playlist,
      });

      return playlist;
    } catch (error) {
      logger.error('Failed to fetch user playlist', {
        userId,
        playlistType,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Create or update user's playlist
   */
  async upsert(
    userId: string,
    playlistType: PlaylistType,
    spotifyPlaylistId: string,
  ): Promise<void> {
    logger.debug('Upserting user playlist', {
      userId,
      playlistType,
      spotifyPlaylistId,
    });

    try {
      await this.prismaClient.userPlaylist.upsert({
        where: {
          userId_playlistType: { userId, playlistType },
        },
        create: {
          userId,
          playlistType,
          spotifyPlaylistId,
        },
        update: {
          spotifyPlaylistId,
        },
      });

      logger.info('Upserted user playlist', { userId, playlistType });
    } catch (error) {
      logger.error('Failed to upsert user playlist', {
        userId,
        playlistType,
        spotifyPlaylistId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
