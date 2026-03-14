import prisma, { type ExtendedPrismaClient } from '../clients/prisma';
import { NotFoundError } from '../utils/errors';
import { createTaggedLogger } from '../utils/logger';

const logger = createTaggedLogger('Repository:NoSkip');

export class NoSkipRepository {
  constructor(private prismaClient: ExtendedPrismaClient = prisma) {}

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
