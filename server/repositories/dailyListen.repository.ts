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
    todaysListens: Pick<AlbumListen, 'listenedInOrder' | 'albumId'>[],
  ) {
    return this.prismaClient.dailyListen.create({
      data: {
        userId: userId,
        date: new Date(),
        albums: {
          create: todaysListens.map(({ listenedInOrder, albumId }) => ({
            albumId,
            listenedInOrder,
          })),
        },
      },
      include: {
        albums: true,
      },
    });
  }
}
