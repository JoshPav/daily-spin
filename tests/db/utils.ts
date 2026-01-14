import type { Prisma } from '@prisma/client';
import { albumListenInput, userCreateInput } from '../factories/prisma.factory';
import { getTestPrisma } from './setup';

export const createUser = async (
  overrides: Partial<Prisma.UserCreateInput> = {},
) =>
  getTestPrisma().user.create({
    data: userCreateInput(overrides),
    select: { id: true, accounts: true },
  });

export const createDailyListens = async ({
  userId,
  date,
  albumListen,
  albumListens,
}: {
  userId: string;
  date: Date;
  albumListen?: Omit<Prisma.AlbumListenCreateInput, 'dailyListen'>;
  albumListens?: Omit<Prisma.AlbumListenCreateInput, 'dailyListen'>[];
}) =>
  getTestPrisma().dailyListen.create({
    data: {
      userId,
      date,
      albums: {
        create: albumListens
          ? albumListens.map((al) => albumListenInput(al))
          : albumListenInput(albumListen),
      },
    },
  });

export const getAllListensForUser = (userId: string) =>
  getTestPrisma().dailyListen.findMany({
    where: { userId },
    include: { albums: true },
  });
