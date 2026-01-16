import prisma, { type ExtendedPrismaClient } from '../clients/prisma';
import { createTaggedLogger } from '../utils/logger';

const logger = createTaggedLogger('Repository:Backlog');

export type CreateArtist = {
  spotifyId: string;
  name: string;
  imageUrl?: string;
};

export type CreateAlbum = {
  spotifyId: string;
  name: string;
  imageUrl?: string;
  releaseDate?: string;
  totalTracks?: number;
  artists: CreateArtist[];
};

export class BacklogRepository {
  constructor(private prismaClient: ExtendedPrismaClient = prisma) {}

  /**
   * Get all backlog items for a user with related album and artist data
   */
  async getBacklogItems(userId: string) {
    logger.debug('Fetching backlog items', { userId });

    try {
      const result = await this.prismaClient.backlogItem.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
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

      logger.debug('Successfully fetched backlog items', {
        userId,
        count: result.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch backlog items', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getBacklogItemById(id: string, userId: string) {
    logger.debug('Fetching backlog item by ID', { userId, backlogItemId: id });

    try {
      const result = await this.prismaClient.backlogItem.findFirst({
        where: { id, userId },
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

      logger.debug('Successfully fetched backlog item', {
        userId,
        backlogItemId: id,
        found: !!result,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch backlog item by ID', {
        userId,
        backlogItemId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Count backlog items excluding already scheduled albums
   * Used for weighted random selection
   */
  async countUnscheduledBacklogItems(
    userId: string,
    excludeAlbumIds: string[],
  ): Promise<number> {
    logger.debug('Counting unscheduled backlog items', {
      userId,
      excludeCount: excludeAlbumIds.length,
    });

    try {
      const result = await this.prismaClient.backlogItem.count({
        where: {
          userId,
          albumId: { notIn: excludeAlbumIds },
        },
      });

      logger.debug('Successfully counted unscheduled backlog items', {
        userId,
        count: result,
      });

      return result;
    } catch (error) {
      logger.error('Failed to count unscheduled backlog items', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Get a single backlog item at a specific offset
   * Used for weighted random selection with offset
   * Items ordered by createdAt DESC (newest first, oldest last)
   */
  async getBacklogItemAtOffset(
    userId: string,
    excludeAlbumIds: string[],
    offset: number,
  ) {
    logger.debug('Fetching backlog item at offset', {
      userId,
      offset,
      excludeCount: excludeAlbumIds.length,
    });

    try {
      const result = await this.prismaClient.backlogItem.findFirst({
        where: {
          userId,
          albumId: { notIn: excludeAlbumIds },
        },
        orderBy: { createdAt: 'desc' }, // Newest first, so higher offsets = older items
        skip: offset,
        take: 1,
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

      logger.debug('Successfully fetched backlog item at offset', {
        userId,
        offset,
        found: !!result,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch backlog item at offset', {
        userId,
        offset,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Find or create an artist by Spotify ID
   */
  async findOrCreateArtist(artist: CreateArtist) {
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
   * Returns the album with artist relations
   */
  async findOrCreateAlbum(album: CreateAlbum) {
    logger.debug('Finding or creating album', {
      albumSpotifyId: album.spotifyId,
    });

    try {
      // First check if album exists
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
   * Create a backlog item for a user
   * Album must already exist (call findOrCreateAlbum first)
   */
  async createBacklogItem(userId: string, albumId: string) {
    logger.debug('Creating backlog item', { userId, albumId });

    try {
      const result = await this.prismaClient.backlogItem.create({
        data: {
          userId,
          albumId,
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

      logger.debug('Successfully created backlog item', {
        userId,
        backlogItemId: result.id,
        albumId,
      });

      return result;
    } catch (error) {
      logger.error('Failed to create backlog item', {
        userId,
        albumId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Bulk create backlog items
   * Albums must already exist
   */
  async createBacklogItems(items: { userId: string; albumId: string }[]) {
    if (items.length === 0) return 0;

    logger.debug('Bulk creating backlog items', { count: items.length });

    try {
      const result = await this.prismaClient.backlogItem.createMany({
        data: items,
        skipDuplicates: true,
      });

      logger.debug('Successfully bulk created backlog items', {
        count: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to bulk create backlog items', {
        count: items.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async deleteBacklogItem(id: string, userId: string) {
    logger.debug('Deleting backlog item', { userId, backlogItemId: id });

    try {
      const result = await this.prismaClient.backlogItem.delete({
        where: { id, userId },
      });

      logger.debug('Successfully deleted backlog item', {
        userId,
        backlogItemId: id,
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete backlog item', {
        userId,
        backlogItemId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Delete backlog item by album Spotify ID
   */
  async deleteBacklogItemByAlbumSpotifyId(
    userId: string,
    albumSpotifyId: string,
  ) {
    logger.debug('Deleting backlog item by album Spotify ID', {
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

      // Delete the backlog item
      const result = await this.prismaClient.backlogItem.deleteMany({
        where: {
          userId,
          albumId: album.id,
        },
      });

      logger.debug('Successfully deleted backlog item by album Spotify ID', {
        userId,
        albumSpotifyId,
        deletedCount: result.count,
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete backlog item by album Spotify ID', {
        userId,
        albumSpotifyId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Check if a backlog item exists for an album
   */
  async hasBacklogItemByAlbumSpotifyId(userId: string, albumSpotifyId: string) {
    logger.debug('Checking if backlog item exists by album Spotify ID', {
      userId,
      albumSpotifyId,
    });

    try {
      const album = await this.prismaClient.album.findUnique({
        where: { spotifyId: albumSpotifyId },
      });

      if (!album) {
        logger.debug('Album not found, backlog item does not exist', {
          userId,
          albumSpotifyId,
        });
        return false;
      }

      const count = await this.prismaClient.backlogItem.count({
        where: {
          userId,
          albumId: album.id,
        },
      });

      const exists = count > 0;
      logger.debug('Backlog item existence check complete', {
        userId,
        albumSpotifyId,
        exists,
      });

      return exists;
    } catch (error) {
      logger.error('Failed to check backlog item existence', {
        userId,
        albumSpotifyId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Get album IDs that are already in the backlog
   * Used to determine which items were skipped in bulk operations
   */
  async getExistingAlbumSpotifyIds(userId: string, spotifyIds: string[]) {
    logger.debug('Fetching existing album Spotify IDs in backlog', {
      userId,
      count: spotifyIds.length,
    });

    try {
      const existing = await this.prismaClient.backlogItem.findMany({
        where: {
          userId,
          album: {
            spotifyId: { in: spotifyIds },
          },
        },
        include: {
          album: {
            select: {
              spotifyId: true,
            },
          },
        },
      });

      const result = existing.map((item) => item.album.spotifyId);

      logger.debug('Successfully fetched existing album Spotify IDs', {
        userId,
        existingCount: result.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch existing album Spotify IDs', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Bulk delete backlog items by IDs
   * Returns count of deleted items
   */
  async deleteBacklogItems(ids: string[], userId: string) {
    logger.debug('Bulk deleting backlog items', { userId, count: ids.length });

    try {
      const result = await this.prismaClient.backlogItem.deleteMany({
        where: {
          id: { in: ids },
          userId,
        },
      });

      logger.debug('Successfully bulk deleted backlog items', {
        userId,
        deletedCount: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to bulk delete backlog items', {
        userId,
        count: ids.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
