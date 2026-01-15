import type { Prisma } from '@prisma/client';
import {
  type AlbumListenInput,
  DailyListenRepository,
} from '~~/server/repositories/dailyListen.repository';
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
  albumListen?: AlbumListenInput;
  albumListens?: AlbumListenInput[];
}) => {
  const repository = new DailyListenRepository(getTestPrisma());
  const listens = albumListens
    ? albumListens.map((al) => albumListenInput(al))
    : [albumListenInput(albumListen)];

  return repository.saveListens(userId, listens, date);
};

export const getAllListensForUser = (userId: string) =>
  getTestPrisma().dailyListen.findMany({
    where: { userId },
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

export type CreateBacklogItemInput = {
  spotifyId: string;
  name: string;
  imageUrl?: string;
  artists: { spotifyId: string; name: string; imageUrl?: string }[];
  createdAt?: Date;
};

export const createBacklogItem = async ({
  userId,
  item,
}: {
  userId: string;
  item: CreateBacklogItemInput;
}) => {
  const prisma = getTestPrisma();

  // Create or find artists
  const artistRecords = await Promise.all(
    item.artists.map((artist) =>
      prisma.artist.upsert({
        where: { spotifyId: artist.spotifyId },
        update: { name: artist.name, imageUrl: artist.imageUrl },
        create: {
          spotifyId: artist.spotifyId,
          name: artist.name,
          imageUrl: artist.imageUrl,
        },
      }),
    ),
  );

  // Create or find album with artist relations
  let album = await prisma.album.findUnique({
    where: { spotifyId: item.spotifyId },
  });

  if (!album) {
    album = await prisma.album.create({
      data: {
        spotifyId: item.spotifyId,
        name: item.name,
        imageUrl: item.imageUrl,
        artists: {
          create: artistRecords.map((artist, index) => ({
            artistId: artist.id,
            order: index,
          })),
        },
      },
    });
  }

  // Create backlog item
  return prisma.backlogItem.create({
    data: {
      userId,
      albumId: album.id,
      ...(item.createdAt && { createdAt: item.createdAt }),
    },
    include: {
      album: {
        include: {
          artists: {
            include: { artist: true },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });
};

export const getBacklogItemsForUser = (userId: string) =>
  getTestPrisma().backlogItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      album: {
        include: {
          artists: {
            include: { artist: true },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

export const getAlbumBySpotifyId = (spotifyId: string) =>
  getTestPrisma().album.findUnique({
    where: { spotifyId },
  });

export const getArtistBySpotifyId = (spotifyId: string) =>
  getTestPrisma().artist.findUnique({
    where: { spotifyId },
  });
