import { tz } from '@date-fns/tz';
import type { ListenMethod, ListenOrder, ListenTime } from '@prisma/client';
import { startOfDay } from 'date-fns';
import prisma, { type ExtendedPrismaClient } from '../clients/prisma';
import { createTaggedLogger } from '../utils/logger';

const logger = createTaggedLogger('Repository:DailyListen');

export type CreateArtist = {
  spotifyId: string;
  name: string;
  imageUrl?: string;
};

export type CreateAlbum = {
  spotifyId: string;
  name: string;
  imageUrl?: string;
  artists: CreateArtist[];
};

export type AlbumListenInput = {
  album: CreateAlbum;
  listenOrder?: ListenOrder;
  listenMethod?: ListenMethod;
  listenTime?: ListenTime | null;
};

// Type for the result of getListens with all relations included
export type DailyListenWithAlbums = Awaited<
  ReturnType<DailyListenRepository['getListens']>
>[number];

export class DailyListenRepository {
  constructor(private prismaClient: ExtendedPrismaClient = prisma) {}

  async getListens(userId: string, startDate: Date, endDate: Date) {
    logger.debug('Fetching daily listens', {
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    try {
      const result = await this.prismaClient.dailyListen.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          albums: {
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
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      logger.debug('Successfully fetched daily listens', {
        userId,
        count: result.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch daily listens', {
        userId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async saveListens(
    userId: string,
    albumListens: AlbumListenInput[],
    date?: Date,
  ) {
    // Normalize to UTC midnight for consistent date storage
    const dateOfListens = startOfDay(date || new Date(), { in: tz('UTC') });

    logger.debug('Saving daily listens', {
      userId,
      date: dateOfListens.toISOString(),
      albumCount: albumListens.length,
    });

    try {
      // First, find or create all albums
      const albumRecords = await Promise.all(
        albumListens.map((input) => this.findOrCreateAlbum(input.album)),
      );

      // Build the album listen data with album IDs
      const albumListenData = albumListens.map((input, index) => {
        const albumRecord = albumRecords[index];
        if (!albumRecord) {
          throw new Error('Album record not found');
        }
        return {
          albumId: albumRecord.id,
          listenOrder: input.listenOrder ?? 'ordered',
          listenMethod: input.listenMethod ?? 'spotify',
          listenTime: input.listenTime,
        };
      });

      const result = await this.prismaClient.dailyListen.upsert({
        where: {
          userId_date: {
            userId,
            date: dateOfListens,
          },
        },
        create: {
          userId,
          date: dateOfListens,
          albums: {
            create: albumListenData,
          },
        },
        update: {
          albums: {
            createMany: {
              data: albumListenData,
              skipDuplicates: true,
            },
          },
        },
        include: {
          albums: {
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
          },
        },
      });

      logger.debug('Successfully saved daily listens', {
        userId,
        date: dateOfListens.toISOString(),
        albumCount: albumListens.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to save daily listens', {
        userId,
        date: dateOfListens.toISOString(),
        albumCount: albumListens.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async updateFavoriteSong(
    userId: string,
    date: Date,
    favoriteSong: {
      spotifyId: string;
      name: string;
      trackNumber: number;
      albumId: string; // This is the Spotify album ID
    } | null,
  ) {
    logger.debug('Updating favorite song', {
      userId,
      date: date.toISOString(),
      favoriteSong: favoriteSong
        ? { spotifyId: favoriteSong.spotifyId, name: favoriteSong.name }
        : null,
    });

    try {
      // Look up the internal album ID from the Spotify ID
      let internalAlbumId: string | null = null;
      if (favoriteSong?.albumId) {
        const album = await this.prismaClient.album.findUnique({
          where: { spotifyId: favoriteSong.albumId },
          select: { id: true },
        });
        internalAlbumId = album?.id ?? null;
      }

      const result = await this.prismaClient.dailyListen.update({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
        data: {
          favoriteSongId: favoriteSong?.spotifyId ?? null,
          favoriteSongName: favoriteSong?.name ?? null,
          favoriteSongTrackNumber: favoriteSong?.trackNumber ?? null,
          favoriteSongAlbumId: internalAlbumId,
        },
      });

      logger.debug('Successfully updated favorite song', {
        userId,
        date: date.toISOString(),
      });

      return result;
    } catch (error) {
      logger.error('Failed to update favorite song', {
        userId,
        date: date.toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getFavoriteSongsForYear(userId: string, year: number) {
    logger.debug('Fetching favorite songs for year', { userId, year });

    try {
      const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
      const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

      const result = await this.prismaClient.dailyListen.findMany({
        where: {
          userId,
          date: {
            gte: startOfYear,
            lte: endOfYear,
          },
          favoriteSongId: {
            not: null,
          },
        },
        select: {
          date: true,
          favoriteSongId: true,
          favoriteSongName: true,
          favoriteSongTrackNumber: true,
          favoriteSongAlbumId: true,
        },
        orderBy: {
          date: 'asc',
        },
      });

      logger.debug('Successfully fetched favorite songs for year', {
        userId,
        year,
        count: result.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch favorite songs for year', {
        userId,
        year,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async findOrCreateArtist(artist: CreateArtist) {
    logger.debug('Finding or creating artist', {
      artistSpotifyId: artist.spotifyId,
      artistName: artist.name,
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

  private async findOrCreateAlbum(album: CreateAlbum) {
    logger.debug('Finding or creating album', {
      albumSpotifyId: album.spotifyId,
      albumName: album.name,
    });

    try {
      // Check if album already exists
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

      // Create or find all artists first
      const artists = await Promise.all(
        album.artists.map((artist) => this.findOrCreateArtist(artist)),
      );

      // Create album with artist relations
      const result = await this.prismaClient.album.create({
        data: {
          spotifyId: album.spotifyId,
          name: album.name,
          imageUrl: album.imageUrl,
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
}
