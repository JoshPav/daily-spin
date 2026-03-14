import prisma, { type ExtendedPrismaClient } from '../clients/prisma';
import { NotFoundError } from '../utils/errors';
import { createTaggedLogger } from '../utils/logger';

const logger = createTaggedLogger('Repository:NoSkip');

export class NoSkipRepository {
  constructor(private prismaClient: ExtendedPrismaClient = prisma) {}

  /**
   * Returns the set of internal Album IDs the user has marked as no-skip.
   */
  async getNoSkipAlbumIds(userId: string): Promise<Set<string>> {
    logger.debug('Fetching no-skip album IDs', { userId });

    try {
      const records = await this.prismaClient.userNoSkipAlbum.findMany({
        where: { userId },
        select: { albumId: true },
      });

      logger.debug('Successfully fetched no-skip album IDs', {
        userId,
        count: records.length,
      });

      return new Set(records.map((r) => r.albumId));
    } catch (error) {
      logger.error('Failed to fetch no-skip album IDs', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Marks (noSkip=true) or unmarks (noSkip=false) an album as no-skip for a user.
   * Looks up the album by its Spotify ID.
   */
  async setNoSkip(
    userId: string,
    spotifyAlbumId: string,
    noSkip: boolean,
  ): Promise<boolean> {
    logger.debug('Setting no-skip label', { userId, spotifyAlbumId, noSkip });

    try {
      const album = await this.prismaClient.album.findUnique({
        where: { spotifyId: spotifyAlbumId },
        select: { id: true },
      });

      if (!album) {
        throw new NotFoundError('Album', { spotifyAlbumId });
      }

      if (noSkip) {
        await this.prismaClient.userNoSkipAlbum.upsert({
          where: { userId_albumId: { userId, albumId: album.id } },
          create: { userId, albumId: album.id },
          update: {},
        });
      } else {
        await this.prismaClient.userNoSkipAlbum.deleteMany({
          where: { userId, albumId: album.id },
        });
      }

      logger.debug('Successfully set no-skip label', {
        userId,
        spotifyAlbumId,
        noSkip,
      });

      return noSkip;
    } catch (error) {
      logger.error('Failed to set no-skip label', {
        userId,
        spotifyAlbumId,
        noSkip,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
