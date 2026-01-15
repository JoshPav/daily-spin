import type { PrismaClient } from '@prisma/client';
import prisma from '../clients/prisma';
import type { CreateAlbum } from './backlog.repository';

export class FutureListenRepository {
  constructor(private prismaClient: PrismaClient = prisma) {}

  /**
   * Get all future listens for a user with related album and artist data
   */
  async getFutureListens(userId: string) {
    return await this.prismaClient.futureListen.findMany({
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
  }

  /**
   * Get a future listen by date for a user
   */
  async getFutureListenByDate(userId: string, date: Date) {
    return await this.prismaClient.futureListen.findUnique({
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
  }

  /**
   * Find or create an artist by Spotify ID
   */
  async findOrCreateArtist(artist: {
    spotifyId: string;
    name: string;
    imageUrl?: string;
  }) {
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
   */
  async findOrCreateAlbum(album: CreateAlbum) {
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

    const artists = await Promise.all(
      album.artists.map((artist) => this.findOrCreateArtist(artist)),
    );

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
   * Create or update a future listen for a user on a specific date
   */
  async upsertFutureListen(userId: string, albumId: string, date: Date) {
    return await this.prismaClient.futureListen.upsert({
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
  }

  /**
   * Delete a future listen by ID
   */
  async deleteFutureListen(id: string, userId: string) {
    return await this.prismaClient.futureListen.delete({
      where: { id, userId },
    });
  }

  /**
   * Delete a future listen by date
   */
  async deleteFutureListenByDate(userId: string, date: Date) {
    return await this.prismaClient.futureListen.delete({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    });
  }
}
