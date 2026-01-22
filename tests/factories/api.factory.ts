import { faker } from '@faker-js/faker';
import { addDays, format, subDays } from 'date-fns';
import type {
  AddAlbumListenBody,
  AddBacklogItemBody,
  AddScheduledListenBody,
  Album,
  Artist,
  BacklogAlbum,
  BacklogArtist,
  DailyAlbumListen,
  DailyListens,
  FavoriteSong,
  GetPreferencesResponse,
  GetScheduledListensResponse,
  LinkedPlaylist,
  ListenMetadata,
  PlaylistType,
  ScheduledListenAlbum,
  ScheduledListenItem,
  UserPreferences,
} from '~~/shared/schema';
import { createFactory } from './factory';

const {
  string: { uuid },
  image: { url },
  music,
  date,
} = faker;

/** Formats a Date to YYYY-MM-DD string for API mock data */
const toDateString = (d: Date): string => format(d, 'yyyy-MM-dd');

type EventHandler = ReturnType<typeof defineEventHandler>;

type HandlerEvent = Parameters<EventHandler>[0];

export const createHandlerEvent = (
  userId: string,
  { body = {}, query = {}, params = {} } = {} as {
    body?: unknown;
    query?: Record<string, string>;
    params?: Record<string, string>;
  },
) =>
  handlerEvent({
    _requestBody: JSON.stringify(body),
    _path: `/path${query ? `?${new URLSearchParams(query).toString()}` : ''}`,
    _routerParams: params,
    context: { userId },
  } as unknown as HandlerEvent);

const handlerEvent = createFactory<HandlerEvent>(() => ({}) as HandlerEvent);

export const getListensReponse = ({
  n = 14,
  startDate = new Date(),
}): DailyListens[] => {
  const listens: DailyListens[] = [];

  // Create n days of listens, from oldest to newest (ending at startDate)
  for (let i = n - 1; i >= 0; i--) {
    listens.push(dailyListens({ date: toDateString(subDays(startDate, i)) }));
  }

  return listens;
};

export const dailyListens = createFactory<DailyListens>(() => ({
  date: toDateString(faker.date.recent()),
  albums: [dailyAlbumListen()],
  favoriteSong: favouriteSong(),
}));

export const favouriteSong = createFactory<FavoriteSong>(() => ({
  albumId: faker.string.uuid(),
  name: faker.music.songName(),
  spotifyId: faker.string.uuid(),
  trackNumber: faker.number.int({ max: 12 }),
}));

export const artist = createFactory<Artist>(() => ({
  name: music.artist(),
  spotifyId: uuid(),
}));

export const album = createFactory<Album>(() => ({
  albumId: uuid(),
  albumName: music.songName(),
  artists: [artist()],
  imageUrl: url(),
}));

export const listenMetadata = createFactory<ListenMetadata>(() => ({
  listenOrder: 'ordered',
  listenMethod: 'spotify',
  listenTime: 'noon',
  favoriteSong: null,
}));

export const dailyAlbumListen = createFactory<DailyAlbumListen>(() => ({
  id: uuid(),
  album: album(),
  listenMetadata: listenMetadata(),
}));

export const addAlbumListenBody = createFactory<AddAlbumListenBody>(() => ({
  album: album(),
  listenMetadata: listenMetadata(),
  date: toDateString(date.recent()),
}));

export const backlogArtist = createFactory<BacklogArtist>(() => ({
  spotifyId: uuid(),
  name: music.artist(),
  imageUrl: url(),
}));

export const addBacklogItemBody = createFactory<AddBacklogItemBody>(() => ({
  spotifyId: uuid(),
  name: music.songName(),
  imageUrl: url(),
  artists: [backlogArtist()],
}));

export const addScheduledListenBody = createFactory<AddScheduledListenBody>(
  () => ({
    spotifyId: uuid(),
    name: music.songName(),
    imageUrl: url(),
    releaseDate: date.past().toISOString(),
    totalTracks: faker.number.int({ min: 5, max: 20 }),
    artists: [backlogArtist()],
    date: toDateString(date.future()),
  }),
);

export const backlogAlbum = (
  overrides: Partial<BacklogAlbum>,
): BacklogAlbum => ({
  id: faker.string.uuid(),
  spotifyId: faker.string.uuid(),
  name: faker.music.album(),
  imageUrl: faker.image.url(),
  artists: [artist()],
  addedAt: faker.date.recent().toISOString(),
  ...overrides,
});

export const scheduledListenAlbum = createFactory<ScheduledListenAlbum>(() => ({
  spotifyId: uuid(),
  name: music.songName(),
  imageUrl: url(),
  artists: [artist()],
}));

export const getScheduledListensResponse = ({
  n = 7,
  startDate = new Date(),
  hasMore = false,
}): GetScheduledListensResponse => {
  const items: Record<string, ScheduledListenItem | null> = {};

  // Create n days of scheduled listens as date-keyed object
  for (let i = 0; i < n; i++) {
    const dateKey = toDateString(addDays(startDate, i));
    items[dateKey] = scheduledListenItem({ date: dateKey });
  }

  const endDate = addDays(startDate, n - 1);

  return {
    items,
    pagination: {
      startDate: toDateString(startDate),
      endDate: toDateString(endDate),
      total: n,
      hasMore,
    },
  };
};

export const scheduledListenItem = createFactory<ScheduledListenItem>(() => ({
  id: uuid(),
  date: toDateString(faker.date.future()),
  album: scheduledListenAlbum(),
}));

// Preferences factories
export const userPreferences = createFactory<UserPreferences>(() => ({
  trackListeningHistory: true,
  createTodaysAlbumPlaylist: false,
  createSongOfDayPlaylist: false,
}));

export const linkedPlaylist = createFactory<LinkedPlaylist>(() => ({
  type: 'album_of_the_day' as PlaylistType,
  spotifyPlaylistId: uuid(),
  spotifyUrl: `https://open.spotify.com/playlist/${uuid()}`,
}));

export const getPreferencesResponse = createFactory<GetPreferencesResponse>(
  () => ({
    preferences: userPreferences(),
    linkedPlaylists: [],
  }),
);
