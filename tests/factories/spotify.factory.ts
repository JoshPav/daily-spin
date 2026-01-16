import { faker } from '@faker-js/faker';
import type {
  Context,
  Page,
  PlayHistory,
  Playlist,
  RecentlyPlayedTracksPage,
  SimplifiedAlbum,
  SimplifiedArtist,
  SimplifiedTrack,
  Track,
  TrackItem,
  UserProfile,
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

export const simplifiedTrack = createFactory<SimplifiedTrack>(() => ({
  artists: [simplifiedArtist()],
  available_markets: ['US', 'GB', 'CA'],
  disc_number: 1,
  duration_ms: int({ min: 120000, max: 360000 }), // 2-6 minutes
  episode: false,
  explicit: faker.datatype.boolean(),
  external_urls: {
    spotify: url(),
  },
  href: url(),
  id: uuid(),
  is_local: false,
  name: songName(),
  preview_url: url(),
  track: true,
  track_number: int({ min: 1, max: 15 }),
  type: 'track',
  uri: `spotify:track:${uuid()}`,
}));

export const track = createFactory<Track>(() => ({
  ...simplifiedTrack(),
  album: simplifiedAlbum(),
  external_ids: {
    isrc: `US${int({ min: 10000000000, max: 99999999999 })}`,
    ean: int({ min: 1000000000000, max: 9999999999999 }).toString(),
    upc: int({ min: 100000000000, max: 999999999999 }).toString(),
  },
  popularity: int({ min: 0, max: 100 }),
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

export const page = createFactory<Page<SimplifiedTrack>>(() => ({
  href: url(),
  limit: 50,
  next: null,
  offset: 0,
  previous: null,
  total: 0,
  items: [],
}));

export const playlist = createFactory<Playlist<TrackItem>>(() => ({
  collaborative: false,
  description: faker.lorem.sentence(),
  external_urls: {
    spotify: url(),
  },
  followers: {
    href: null,
    total: int({ min: 0, max: 10000 }),
  },
  href: url(),
  id: uuid(),
  images: [
    {
      url: imageUrl(),
      height: 640,
      width: 640,
    },
  ],
  name: faker.music.songName(),
  owner: {
    display_name: faker.person.fullName(),
    external_urls: {
      spotify: url(),
    },
    href: url(),
    id: uuid(),
    type: 'user',
    uri: `spotify:user:${uuid()}`,
  },
  primary_color: '',
  public: false,
  snapshot_id: uuid(),
  tracks: {
    href: url(),
    limit: 50,
    next: null,
    offset: 0,
    previous: null,
    total: 0,
    items: [],
  },
  type: 'playlist',
  uri: `spotify:playlist:${uuid()}`,
}));

export const userProfile = createFactory<UserProfile>(() => ({
  country: 'US',
  display_name: faker.person.fullName(),
  email: faker.internet.email(),
  explicit_content: {
    filter_enabled: false,
    filter_locked: false,
  },
  external_urls: {
    spotify: url(),
  },
  followers: {
    href: null,
    total: int({ min: 0, max: 1000 }),
  },
  href: url(),
  id: uuid(),
  images: [
    {
      url: imageUrl(),
      height: 300,
      width: 300,
    },
  ],
  product: 'premium',
  type: 'user',
  uri: `spotify:user:${uuid()}`,
}));
