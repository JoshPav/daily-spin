import type { PrismaClient } from '@prisma/client';
import prisma from '../clients/prisma';

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
  constructor(private prismaClient: PrismaClient = prisma) {}

  /**
   * Get all backlog items for a user with related album and artist data
   */
  async getBacklogItems(userId: string) {
    return await this.prismaClient.backlogItem.findMany({
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
  }

  async getBacklogItemById(id: string, userId: string) {
    return await this.prismaClient.backlogItem.findFirst({
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
  }

  /**
   * Count backlog items excluding already scheduled albums
   * Used for weighted random selection
   */
  async countUnscheduledBacklogItems(
    userId: string,
    excludeAlbumIds: string[],
  ): Promise<number> {
    return await this.prismaClient.backlogItem.count({
      where: {
        userId,
        albumId: { notIn: excludeAlbumIds },
      },
    });
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
    return await this.prismaClient.backlogItem.findFirst({
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
  }

  /**
   * Find or create an artist by Spotify ID
   */
  async findOrCreateArtist(artist: CreateArtist) {
    return await this.prismaClient.artist.upsert({
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
  }

  /**
   * Find or create an album with its artists
   * Returns the album with artist relations
   */
  async findOrCreateAlbum(album: CreateAlbum) {
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
      return existing;
    }

    // Create or find all artists first
    const artists = await Promise.all(
      album.artists.map((artist) => this.findOrCreateArtist(artist)),
    );

    // Create album with artist relations
    return await this.prismaClient.album.create({
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
  }

  /**
   * Create a backlog item for a user
   * Album must already exist (call findOrCreateAlbum first)
   */
  async createBacklogItem(userId: string, albumId: string) {
    return await this.prismaClient.backlogItem.create({
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
  }

  /**
   * Bulk create backlog items
   * Albums must already exist
   */
  async createBacklogItems(items: { userId: string; albumId: string }[]) {
    if (items.length === 0) return 0;

    const result = await this.prismaClient.backlogItem.createMany({
      data: items,
      skipDuplicates: true,
    });

    return result.count;
  }

  async deleteBacklogItem(id: string, userId: string) {
    return await this.prismaClient.backlogItem.delete({
      where: { id, userId },
    });
  }

  /**
   * Delete backlog item by album Spotify ID
   */
  async deleteBacklogItemByAlbumSpotifyId(
    userId: string,
    albumSpotifyId: string,
  ) {
    // Find the album by Spotify ID
    const album = await this.prismaClient.album.findUnique({
      where: { spotifyId: albumSpotifyId },
    });

    if (!album) {
      return { count: 0 };
    }

    // Delete the backlog item
    return await this.prismaClient.backlogItem.deleteMany({
      where: {
        userId,
        albumId: album.id,
      },
    });
  }

  /**
   * Check if a backlog item exists for an album
   */
  async hasBacklogItemByAlbumSpotifyId(userId: string, albumSpotifyId: string) {
    const album = await this.prismaClient.album.findUnique({
      where: { spotifyId: albumSpotifyId },
    });

    if (!album) {
      return false;
    }

    const count = await this.prismaClient.backlogItem.count({
      where: {
        userId,
        albumId: album.id,
      },
    });

    return count > 0;
  }

  /**
   * Get album IDs that are already in the backlog
   * Used to determine which items were skipped in bulk operations
   */
  async getExistingAlbumSpotifyIds(userId: string, spotifyIds: string[]) {
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

    return existing.map((item) => item.album.spotifyId);
  }

  /**
   * Bulk delete backlog items by IDs
   * Returns count of deleted items
   */
  async deleteBacklogItems(ids: string[], userId: string) {
    const result = await this.prismaClient.backlogItem.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });
    return result.count;
  }
}
