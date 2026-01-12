import type {
  AlbumListen as PrismaAlbumListen,
  PrismaClient,
} from '@prisma/client';
import prisma from '../clients/prisma';

export type AlbumListen = Pick<
  PrismaAlbumListen,
  | 'listenedInOrder'
  | 'albumId'
  | 'albumName'
  | 'imageUrl'
  | 'artistNames'
  | 'listenMethod'
  | 'listenTime'
>;

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
        albums: true,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async saveListens(userId: string, todaysListens: AlbumListen[], date?: Date) {
    const dateOfListens = date || new Date();
    dateOfListens.setUTCHours(0, 0, 0, 0);

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
          create: todaysListens.map(
            ({
              albumId,
              albumName,
              artistNames,
              imageUrl,
              listenedInOrder,
              listenTime,
            }) => ({
              albumId,
              albumName,
              artistNames,
              imageUrl,
              listenedInOrder,
              listenTime,
            }),
          ),
        },
      },
      update: {
        albums: {
          createMany: {
            data: todaysListens.map(
              ({
                albumId,
                albumName,
                artistNames,
                imageUrl,
                listenedInOrder,
                listenMethod,
                listenTime,
              }) => ({
                albumId,
                albumName,
                artistNames,
                imageUrl,
                listenedInOrder,
                listenMethod,
                listenTime,
              }),
            ),
            skipDuplicates: true,
          },
        },
      },
      include: {
        albums: true,
      },
    });
  }
}
