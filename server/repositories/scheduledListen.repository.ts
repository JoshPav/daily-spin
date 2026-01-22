import prisma, { type ExtendedPrismaClient } from '../clients/prisma';
import { createTaggedLogger } from '../utils/logger';
import type { CreateAlbum } from './backlog.repository';

const logger = createTaggedLogger('Repository:ScheduledListen');

export class ScheduledListenRepository {
  constructor(private prismaClient: ExtendedPrismaClient = prisma) {}

  /**
   * Get scheduled listens for a user within a date range with pagination metadata
   * If endDate is omitted, returns all scheduled listens from startDate onwards
   */
  async getScheduledListensInRange(
    userId: string,
    startDate: Date,
    endDate?: Date,
  ) {
    logger.debug('Fetching paginated scheduled listens', {
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString(),
    });

    try {
      const itemsPromise = this.prismaClient.scheduledListen.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
        include: {
          album: {
            include: {
              artists: {
                include: {
                  artist: true,
                },
                orderBy: {
                  order: 'asc',
                },
              },
            },
          },
        },
      });

      // Only check hasMore if we have an endDate (pagination)
      const hasMoreCountPromise = endDate
        ? this.prismaClient.scheduledListen.count({
            where: {
              userId,
              date: {
                gt: endDate,
              },
            },
          })
        : Promise.resolve(0);

      // Fetch items and hasMore count in parallel
      const [items, hasMoreCount] = await Promise.all([
        itemsPromise,
        hasMoreCountPromise,
      ]);

      const total = items.length;
      const hasMore = hasMoreCount > 0;

      logger.debug('Successfully fetched paginated scheduled listens', {
        userId,
        count: total,
        hasMore,
      });

      return { items, total, hasMore };
    } catch (error) {
      logger.error('Failed to fetch paginated scheduled listens', {
        userId,
        startDate: startDate.toISOString(),
        endDate: endDate?.toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Get a scheduled listen by date for a user
   */
  async getScheduledListenByDate(userId: string, date: Date) {
    logger.debug('Fetching scheduled listen by date', {
      userId,
      date: date.toISOString(),
    });

    try {
      const result = await this.prismaClient.scheduledListen.findUnique({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
        include: {
          album: {
            include: {
              artists: {
                include: {
                  artist: true,
                },
                orderBy: {
                  order: 'asc',
                },
              },
            },
          },
        },
      });

      logger.debug('Successfully fetched scheduled listen by date', {
        userId,
        date: date.toISOString(),
        found: !!result,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch scheduled listen by date', {
        userId,
        date: date.toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Find or create an artist by Spotify ID
   */
  async findOrCreateArtist(artist: {
    spotifyId: string;
    name: string;
    imageUrl?: string;
  }) {
    logger.debug('Finding or creating artist', {
      artistSpotifyId: artist.spotifyId,
    });

    try {
      const result = await this.prismaClient.artist.upsert({
        where: { spotifyId: artist.spotifyId },
        update: {
          name: artist.name,
          imageUrl: artist.imageUrl,
        },
        create: {
          spotifyId: artist.spotifyId,
          name: artist.name,
          imageUrl: artist.imageUrl,
        },
      });

      logger.debug('Artist found or created', {
        artistId: result.id,
        artistSpotifyId: artist.spotifyId,
      });

      return result;
    } catch (error) {
      logger.error('Failed to find or create artist', {
        artistSpotifyId: artist.spotifyId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Find or create an album with its artists
   */
  async findOrCreateAlbum(album: CreateAlbum) {
    logger.debug('Finding or creating album', {
      albumSpotifyId: album.spotifyId,
    });

    try {
      const existing = await this.prismaClient.album.findUnique({
        where: { spotifyId: album.spotifyId },
        include: {
          artists: {
            include: {
              artist: true,
            },
          },
        },
      });

      if (existing) {
        logger.debug('Album found', {
          albumId: existing.id,
          albumSpotifyId: album.spotifyId,
        });
        return existing;
      }

      logger.debug('Album not found, creating new album', {
        albumSpotifyId: album.spotifyId,
      });

      const artists = await Promise.all(
        album.artists.map((artist) => this.findOrCreateArtist(artist)),
      );

      const result = await this.prismaClient.album.create({
        data: {
          spotifyId: album.spotifyId,
          name: album.name,
          imageUrl: album.imageUrl,
          releaseDate: album.releaseDate,
          totalTracks: album.totalTracks,
          artists: {
            create: artists.map((artist, index) => ({
              artistId: artist.id,
              order: index,
            })),
          },
        },
        include: {
          artists: {
            include: {
              artist: true,
            },
          },
        },
      });

      logger.debug('Album created', {
        albumId: result.id,
        albumSpotifyId: album.spotifyId,
      });

      return result;
    } catch (error) {
      logger.error('Failed to find or create album', {
        albumSpotifyId: album.spotifyId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Create or update a scheduled listen for a user on a specific date
   */
  async upsertScheduledListen(userId: string, albumId: string, date: Date) {
    logger.debug('Upserting scheduled listen', {
      userId,
      albumId,
      date: date.toISOString(),
    });

    try {
      const result = await this.prismaClient.scheduledListen.upsert({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
        update: {
          albumId,
        },
        create: {
          userId,
          albumId,
          date,
        },
        include: {
          album: {
            include: {
              artists: {
                include: {
                  artist: true,
                },
                orderBy: {
                  order: 'asc',
                },
              },
            },
          },
        },
      });

      logger.debug('Successfully upserted scheduled listen', {
        userId,
        scheduledListenId: result.id,
        albumId,
        date: date.toISOString(),
      });

      return result;
    } catch (error) {
      logger.error('Failed to upsert scheduled listen', {
        userId,
        albumId,
        date: date.toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Delete a scheduled listen by ID
   */
  async deleteScheduledListen(id: string, userId: string) {
    logger.debug('Deleting scheduled listen by ID', {
      userId,
      scheduledListenId: id,
    });

    try {
      const result = await this.prismaClient.scheduledListen.delete({
        where: { id, userId },
      });

      logger.debug('Successfully deleted scheduled listen', {
        userId,
        scheduledListenId: id,
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete scheduled listen by ID', {
        userId,
        scheduledListenId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Delete a scheduled listen by date
   */
  async deleteScheduledListenByDate(userId: string, date: Date) {
    logger.debug('Deleting scheduled listen by date', {
      userId,
      date: date.toISOString(),
    });

    try {
      const result = await this.prismaClient.scheduledListen.delete({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
      });

      logger.debug('Successfully deleted scheduled listen by date', {
        userId,
        date: date.toISOString(),
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete scheduled listen by date', {
        userId,
        date: date.toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Delete scheduled listen by album Spotify ID
   */
  async deleteScheduledListenByAlbumSpotifyId(
    userId: string,
    albumSpotifyId: string,
  ) {
    logger.debug('Deleting scheduled listen by album Spotify ID', {
      userId,
      albumSpotifyId,
    });

    try {
      // Find the album by Spotify ID
      const album = await this.prismaClient.album.findUnique({
        where: { spotifyId: albumSpotifyId },
      });

      if (!album) {
        logger.debug('Album not found, nothing to delete', {
          userId,
          albumSpotifyId,
        });
        return { count: 0 };
      }

      // Delete the scheduled listen
      const result = await this.prismaClient.scheduledListen.deleteMany({
        where: {
          userId,
          albumId: album.id,
        },
      });

      logger.debug(
        'Successfully deleted scheduled listen by album Spotify ID',
        {
          userId,
          albumSpotifyId,
          deletedCount: result.count,
        },
      );

      return result;
    } catch (error) {
      logger.error('Failed to delete scheduled listen by album Spotify ID', {
        userId,
        albumSpotifyId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
