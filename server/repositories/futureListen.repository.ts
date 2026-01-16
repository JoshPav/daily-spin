import type { PrismaClient } from '@prisma/client';
import prisma from '../clients/prisma';
import { createTaggedLogger } from '../utils/logger';
import type { CreateAlbum } from './backlog.repository';

const logger = createTaggedLogger('Repository:FutureListen');

export class FutureListenRepository {
  constructor(private prismaClient: PrismaClient = prisma) {}

  /**
   * Get all future listens for a user with related album and artist data
   */
  async getFutureListens(userId: string) {
    const startTime = Date.now();
    logger.debug('Fetching future listens', { userId });

    try {
      const result = await this.prismaClient.futureListen.findMany({
        where: { userId },
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

      const duration = Date.now() - startTime;
      if (duration > 100) {
        logger.warn('Slow query detected', {
          userId,
          operation: 'getFutureListens',
          duration: `${duration}ms`,
        });
      }

      logger.debug('Successfully fetched future listens', {
        userId,
        count: result.length,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch future listens', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Get a future listen by date for a user
   */
  async getFutureListenByDate(userId: string, date: Date) {
    const startTime = Date.now();
    logger.debug('Fetching future listen by date', {
      userId,
      date: date.toISOString(),
    });

    try {
      const result = await this.prismaClient.futureListen.findUnique({
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

      const duration = Date.now() - startTime;
      if (duration > 100) {
        logger.warn('Slow query detected', {
          userId,
          operation: 'getFutureListenByDate',
          duration: `${duration}ms`,
        });
      }

      logger.debug('Successfully fetched future listen by date', {
        userId,
        date: date.toISOString(),
        found: !!result,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch future listen by date', {
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
   * Create or update a future listen for a user on a specific date
   */
  async upsertFutureListen(userId: string, albumId: string, date: Date) {
    logger.debug('Upserting future listen', {
      userId,
      albumId,
      date: date.toISOString(),
    });

    try {
      const result = await this.prismaClient.futureListen.upsert({
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

      logger.debug('Successfully upserted future listen', {
        userId,
        futureListenId: result.id,
        albumId,
        date: date.toISOString(),
      });

      return result;
    } catch (error) {
      logger.error('Failed to upsert future listen', {
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
   * Delete a future listen by ID
   */
  async deleteFutureListen(id: string, userId: string) {
    logger.debug('Deleting future listen by ID', {
      userId,
      futureListenId: id,
    });

    try {
      const result = await this.prismaClient.futureListen.delete({
        where: { id, userId },
      });

      logger.debug('Successfully deleted future listen', {
        userId,
        futureListenId: id,
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete future listen by ID', {
        userId,
        futureListenId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Delete a future listen by date
   */
  async deleteFutureListenByDate(userId: string, date: Date) {
    logger.debug('Deleting future listen by date', {
      userId,
      date: date.toISOString(),
    });

    try {
      const result = await this.prismaClient.futureListen.delete({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
      });

      logger.debug('Successfully deleted future listen by date', {
        userId,
        date: date.toISOString(),
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete future listen by date', {
        userId,
        date: date.toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
