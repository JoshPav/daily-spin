import type {
  ListenMethod,
  ListenOrder,
  ListenTime,
  PrismaClient,
} from '@prisma/client';
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
  constructor(private prismaClient: PrismaClient = prisma) {}

  async getListens(userId: string, startDate: Date, endDate: Date) {
    return await this.prismaClient.dailyListen.findMany({
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
  }

  async saveListens(
    userId: string,
    albumListens: AlbumListenInput[],
    date?: Date,
  ) {
    const dateOfListens = date || new Date();
    dateOfListens.setUTCHours(0, 0, 0, 0);

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

    return this.prismaClient.dailyListen.upsert({
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
  }

  private async findOrCreateArtist(artist: CreateArtist) {
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

  private async findOrCreateAlbum(album: CreateAlbum) {
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
}
