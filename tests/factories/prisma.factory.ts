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
      accessTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
      scope:
        'user-read-recently-played playlist-modify-public playlist-modify-private',
    },
  },
  sessions: {
    create: {
      id: uuid(),
      token: jwt(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
    },
  },
}));

export const albumListenInput = createFactory<{
  album: {
    spotifyId: string;
    name: string;
    imageUrl?: string;
    artists: { spotifyId: string; name: string; imageUrl?: string }[];
  };
  listenOrder?: ListenOrder;
  listenMethod?: ListenMethod;
  listenTime?: ListenTime | null;
}>(() => ({
  album: {
    spotifyId: uuid(),
    name: album(),
    imageUrl: imageUrl(),
    artists: [
      {
        spotifyId: uuid(),
        name: artist(),
        imageUrl: imageUrl(),
      },
    ],
  },
  listenMethod: 'spotify',
  listenOrder: 'ordered',
  listenTime: 'morning',
}));

type DailyListenWithAlbums = Prisma.DailyListenGetPayload<{
  include: {
    albums: {
      include: {
        album: {
          include: {
            artists: {
              include: {
                artist: true;
              };
            };
          };
        };
      };
    };
  };
}>;

type AlbumListenWithAlbum = DailyListenWithAlbums['albums'][number];

export const artistModel = createFactory<Prisma.ArtistGetPayload<object>>(
  () => ({
    id: uuid(),
    spotifyId: uuid(),
    name: artist(),
    imageUrl: imageUrl(),
    createdAt: recent(),
    updatedAt: recent(),
  }),
);

export const albumModel = createFactory<
  Prisma.AlbumGetPayload<{
    include: {
      artists: {
        include: {
          artist: true;
        };
      };
    };
  }>
>(() => ({
  id: uuid(),
  spotifyId: uuid(),
  name: album(),
  imageUrl: imageUrl(),
  releaseDate: null,
  totalTracks: null,
  createdAt: recent(),
  updatedAt: recent(),
  artists: [
    {
      id: uuid(),
      albumId: uuid(),
      artistId: uuid(),
      order: 0,
      createdAt: recent(),
      updatedAt: recent(),
      artist: artistModel(),
    },
  ],
}));

export const albumListen = createFactory<AlbumListenWithAlbum>(() => {
  const albumData = albumModel();
  return {
    id: uuid(),
    dailyListenId: uuid(),
    albumId: albumData.id,
    listenOrder: 'ordered' as ListenOrder,
    listenMethod: 'spotify' as ListenMethod,
    listenTime: 'morning' as ListenTime,
    favoriteSongId: null,
    favoriteSongName: null,
    favoriteSongTrackNumber: null,
    createdAt: recent(),
    updatedAt: recent(),
    album: albumData,
  };
});

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
