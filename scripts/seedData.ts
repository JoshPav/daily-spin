import type { ListenTime } from '~/shared/schema';

type SeedAlbum = {
  albumName: string;
  artistName: string;
  imageUrl: string;
  albumId: string;
  listenedInOrder: boolean;
  listenTime?: ListenTime;
};

export type SeedDay = {
  day: number;
  dayAlbums: SeedAlbum[];
};

export default [
  {
    day: 1,
    dayAlbums: [
      {
        albumName: 'Imaginal Disk',
        artistName: 'Magdalena Bay',
        imageUrl:
          'https://i.scdn.co/image/ab67616d0000b2737339f7e95927d4b823189f62',
        albumId: '2Htq1sHgmdGffojIBM6Q1s',
        listenedInOrder: true,
      },
    ],
  },
  {
    day: 2,
    dayAlbums: [
      {
        albumName: 'Purxst',
        artistName: 'Last Dinosaurs',
        imageUrl:
          'https://i.scdn.co/image/ab67616d0000b273884a6414f7c1dc14f791f7a7',
        albumId: '6LoPmf1yQRQo4s9qwzDOaO',
        listenedInOrder: true,
      },
    ],
  },
  {
    day: 3,
    dayAlbums: [
      {
        albumName: 'The Clearing',
        artistName: 'Wolf Alice',
        imageUrl:
          'https://i.scdn.co/image/ab67616d0000b273789ef6189aa0777e70bf50b4',
        albumId: '2kKc3Yid0YR3SSbeQ3x5kV',
        listenedInOrder: true,
      },
    ],
  },
  {
    day: 4,
    dayAlbums: [
      {
        albumName: 'People Watching (Deluxe Edition)',
        artistName: 'Sam Fender',
        imageUrl:
          'https://i.scdn.co/image/ab67616d0000b27370722c52a53ef4a56f0c2eb0',
        albumId: '4gwfCCNRxAB1P62hlDCelM',
        listenedInOrder: true,
      },
    ],
  },
  {
    day: 5,
    dayAlbums: [
      {
        albumName: 'Neon Pill',
        artistName: 'Cage The Elephant',
        imageUrl:
          'https://i.scdn.co/image/ab67616d0000b273479cf8279b8723c5988ab68f',
        albumId: '2dGlEut1TyhAyApZ0ADIsd',
        listenedInOrder: true,
      },
    ],
  },
  {
    day: 6,
    dayAlbums: [
      {
        albumName: 'Life Is Yours',
        artistName: 'Foals',
        imageUrl:
          'https://i.scdn.co/image/ab67616d0000b273408cece71a6d1cdcf2d4ad15',
        albumId: '2dGlEut1TyhAyApZ0ADIsd',
        listenedInOrder: true,
      },
    ],
  },
  {
    day: 7,
    dayAlbums: [
      {
        albumName: 'Rumours',
        artistName: 'Fleetwood Mac',
        imageUrl:
          'https://i.scdn.co/image/ab67616d0000b27357df7ce0eac715cf70e519a7',
        albumId: '1bt6q2SruMsBtcerNVtpZB',
        listenedInOrder: true,
      },
      {
        albumName: '"Heroes" (2017 Remaster)',
        artistName: 'David Bowie',
        imageUrl:
          'https://i.scdn.co/image/ab67616d0000b273204f41d52743c6a9efd62985',
        albumId: '4I5zzKYd2SKDgZ9DRf5LVk',
        listenedInOrder: true,
      },
      {
        albumName: 'hickey',
        artistName: 'Royel Otis',
        imageUrl:
          'https://i.scdn.co/image/ab67616d0000b2739ea7c8a96a35dc122fcbc621',
        albumId: '7iX7uCkSNnkuIMwbjl8Jpf',
        listenedInOrder: true,
      },
    ],
  },
  {
    day: 8,
    dayAlbums: [
      {
        albumName: 'Pacific Heavy Highway',
        artistName: 'Skegss',
        imageUrl:
          'https://i.scdn.co/image/ab67616d0000b273ece66bbdbbee3ee01b07afdd',
        albumId: '6CLRZuwn4WFgY4e1IsMcBq',
        listenedInOrder: false,
      },
    ],
  },
  {
    day: 9,
    dayAlbums: [
      {
        albumId: '3T5osCmLRKocwvc1yobKwB',
        albumName: 'Portal',
        artistName: 'Balu Brigada',
        imageUrl:
          'https://i.scdn.co/image/ab67616d00001e026d311c934960d499a5b4c2c5',
        listenedInOrder: true,
      },
      {
        albumId: '0eeXb23yMW6EaIgm63xxPC',
        artistName: 'Geese',
        albumName: 'Getting Killed',
        listenedInOrder: true,
        imageUrl:
          'https://i.scdn.co/image/ab67616d00001e0245e82ae0372a50834825c018',
      },
    ],
  },
  {
    day: 10,
    dayAlbums: [
      {
        albumId: '1ERrUvG31thFCxdwWUoJrY',
        albumName: 'Mercurial World',
        artistName: 'Magdalena Bay',
        imageUrl:
          'https://i.scdn.co/image/ab67616d00001e020ecbdac77e72dc16719a3e89',
        listenedInOrder: false,
        listenTime: 'morning',
      },
    ],
  },
  {
    day: 11,
    dayAlbums: [
      {
        albumId: '6iHuSGy6pq4tNGFV3ZVPtl',
        albumName: 'Substance',
        artistName: 'New Order',
        imageUrl:
          'https://i.scdn.co/image/ab67616d00001e023c182241fcd86aeca2c68a63',
        listenedInOrder: true,
        listenTime: 'noon',
      },
    ],
  },
] satisfies SeedDay[];
