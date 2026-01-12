import { faker } from '@faker-js/faker';
import type {
  Context,
  PlayHistory,
  RecentlyPlayedTracksPage,
  SimplifiedAlbum,
  SimplifiedArtist,
  Track,
} from '@spotify/web-api-ts-sdk';
import { createFactory } from './factory';

const {
  string: { uuid },
  number: { int },
  music: { album, artist, genre, songName },
  date,
  internet: { url },
  image: { url: imageUrl },
  company: { name: companyName },
} = faker;

export const toPlayHistory = ({
  tracks,
  date = '2026-01-01',
  hour = '12',
}: {
  tracks: Track[];
  date?: string;
  hour?: string;
}) =>
  tracks.map((track, i) =>
    playHistory({ track, played_at: `${date}T${hour}:${10 + i}:00.000Z` }),
  );

export const createFullAlbumPlayHistory = ({
  tracksInAlbum = 10,
  date = '2026-01-01',
  hour = '12',
} = {}) => {
  const { album, tracks } = createAlbumAndTracks({ tracksInAlbum });

  return { history: toPlayHistory({ tracks, date, hour }), tracks, album };
};

export const createAlbumTracks = ({ album }: { album: SimplifiedAlbum }) => {
  const tracks: Track[] = [];

  for (let i = 0; i < album.total_tracks; i++) {
    tracks.push(
      track({
        track_number: i + 1,
        album,
        artists: album.artists,
      }),
    );
  }

  return tracks;
};

export const createAlbumAndTracks = ({ tracksInAlbum = 10 } = {}) => {
  const album = simplifiedAlbum({ total_tracks: tracksInAlbum });

  return { album, tracks: createAlbumTracks({ album }) };
};

export const simplifiedAlbum = createFactory<SimplifiedAlbum>(() => ({
  album_group: 'album',
  album_type: 'album',
  artists: [simplifiedArtist()],
  available_markets: ['US', 'GB', 'CA'],
  copyrights: [
    {
      text: `© ${date.past({ years: 5 }).getFullYear()} ${companyName()}`,
      type: 'C',
    },
  ],
  external_ids: {
    ean: int({ min: 1000000000000, max: 9999999999999 }).toString(),
    isrc: `US${int({ min: 10000000000, max: 99999999999 })}`,
    upc: int({ min: 100000000000, max: 999999999999 }).toString(),
  },
  external_urls: {
    spotify: url(),
  },
  genres: [genre(), genre()],
  href: url(),
  id: uuid(),
  images: [
    {
      url: imageUrl(),
      height: 640,
      width: 640,
    },
    {
      url: imageUrl(),
      height: 300,
      width: 300,
    },
    {
      url: imageUrl(),
      height: 64,
      width: 64,
    },
  ],
  label: companyName(),
  name: album(),
  popularity: int({ min: 0, max: 100 }),
  release_date: date.past({ years: 5 }).toISOString(),
  release_date_precision: 'day',
  total_tracks: int({ min: 8, max: 15 }),
  type: 'album',
  uri: `spotify:album:${uuid()}`,
}));

export const simplifiedArtist = createFactory<SimplifiedArtist>(() => ({
  external_urls: {
    spotify: url(),
  },
  href: url(),
  id: uuid(),
  name: artist(),
  type: 'artist',
  uri: `spotify:artist:${uuid()}`,
}));

export const track = createFactory<Track>(() => ({
  album: simplifiedAlbum(),
  artists: [simplifiedArtist()],
  available_markets: ['US', 'GB', 'CA'],
  disc_number: 1,
  duration_ms: int({ min: 120000, max: 360000 }), // 2-6 minutes
  episode: false,
  explicit: faker.datatype.boolean(),
  external_ids: {
    isrc: `US${int({ min: 10000000000, max: 99999999999 })}`,
    ean: int({ min: 1000000000000, max: 9999999999999 }).toString(),
    upc: int({ min: 100000000000, max: 999999999999 }).toString(),
  },
  external_urls: {
    spotify: url(),
  },
  href: url(),
  id: uuid(),
  is_local: false,
  name: songName(),
  popularity: int({ min: 0, max: 100 }),
  preview_url: url(),
  track: true,
  track_number: int({ min: 1, max: 15 }),
  type: 'track',
  uri: `spotify:track:${uuid()}`,
}));

export const context = createFactory<Context>(() => ({
  href: url(),
  external_urls: { spotify: url() },
  type: 'context',
  uri: `spotify:context:${uuid()}`,
}));

export const playHistory = createFactory<PlayHistory>(() => ({
  context: context(),
  played_at: '',
  track: track(),
}));

export const recentlyPlayed = createFactory<RecentlyPlayedTracksPage>(() => ({
  cursors: { after: '', before: '' },
  href: '',
  items: [],
  limit: 0,
  next: '',
  total: 0,
}));
