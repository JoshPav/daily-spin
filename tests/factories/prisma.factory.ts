import { faker } from '@faker-js/faker';
import type {
  ListenMethod,
  ListenOrder,
  ListenTime,
  Prisma,
} from '@prisma/client';
import { createFactory } from './factory';

const {
  string: { uuid },
  music: { album, artist },
  image: { url: imageUrl },
  date: { recent, past },
  internet: { email, jwt },
  person: { fullName },
} = faker;

export const userCreateInput = createFactory<Prisma.UserCreateInput>(() => ({
  email: email(),
  name: fullName(),
  trackListeningHistory: true,
  createTodaysAlbumPlaylist: true,
  createSongOfDayPlaylist: true,
  accounts: {
    create: {
      providerId: 'spotify',
      accountId: uuid(),
      id: uuid(),
      accessToken: jwt(),
      refreshToken: jwt(),
      accessTokenExpiresAt: faker.date.soon({ days: 1 }),
      scope:
        'user-read-recently-played playlist-modify-public playlist-modify-private',
    },
  },
  sessions: {
    create: {
      id: uuid(),
      token: jwt(),
      expiresAt: faker.date.soon({ days: 1 }),
    },
  },
}));

export const albumListenInput = createFactory<
  Omit<Prisma.AlbumListenCreateInput, 'dailyListen'>
>(() => ({
  albumId: uuid(),
  albumName: album(),
  artistNames: artist(),
  imageUrl: imageUrl(),
  listenMethod: 'spotify',
  listenOrder: 'ordered',
  listenTime: 'morning',
}));

type AlbumListenModel = Prisma.AlbumListenGetPayload<object>;
type DailyListenWithAlbums = Prisma.DailyListenGetPayload<{
  include: { albums: true };
}>;

export const albumListen = createFactory<AlbumListenModel>(() => ({
  id: uuid(),
  dailyListenId: uuid(),
  albumId: uuid(),
  albumName: album(),
  artistNames: artist(),
  imageUrl: imageUrl(),
  listenOrder: 'ordered' as ListenOrder,
  listenMethod: 'spotify' as ListenMethod,
  listenTime: 'morning' as ListenTime,
  createdAt: recent(),
  updatedAt: recent(),
}));

export const dailyListenWithAlbums = createFactory<DailyListenWithAlbums>(
  () => ({
    id: uuid(),
    userId: uuid(),
    date: past(),
    albums: [],
    createdAt: recent(),
    updatedAt: recent(),
  }),
);
