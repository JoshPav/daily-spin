import type { AlbumListen, PrismaClient } from '@prisma/client';
import prisma from '../clients/prisma';

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

  async saveListens(
    userId: string,
    todaysListens: Pick<
      AlbumListen,
      'listenedInOrder' | 'albumId' | 'albumName' | 'imageUrl' | 'artistNames'
    >[],
  ) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return this.prismaClient.dailyListen.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      create: {
        userId,
        date: today,
        albums: {
          create: todaysListens.map(
            ({
              albumId,
              albumName,
              artistNames,
              imageUrl,
              listenedInOrder,
            }) => ({
              albumId,
              albumName,
              artistNames,
              imageUrl,
              listenedInOrder,
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
              }) => ({
                albumId,
                albumName,
                artistNames,
                imageUrl,
                listenedInOrder,
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
