import { faker } from '@faker-js/faker';
import type {
  AddAlbumListenBody,
  AddBacklogItemBody,
  AddFutureListenBody,
  Album,
  Artist,
  BacklogAlbum,
  BacklogArtist,
  DailyAlbumListen,
  DailyListens,
  FavoriteSong,
  FutureListenAlbum,
  FutureListenItem,
  GetFutureListensResponse,
  ListenMetadata,
} from '~~/shared/schema';
import { createFactory } from './factory';
import { addDays, subDays } from 'date-fns';

const {
  string: { uuid },
  image: { url },
  music,
  date,
} = faker;

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
    listens.push(dailyListens({ date: subDays(startDate, i).toISOString() }));
  }

  return listens;
};

export const dailyListens = createFactory<DailyListens>(() => ({
  date: faker.date.recent().toISOString(),
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
  date: date.recent().toISOString(),
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

export const addFutureListenBody = createFactory<AddFutureListenBody>(() => ({
  spotifyId: uuid(),
  name: music.songName(),
  imageUrl: url(),
  releaseDate: date.past().toISOString(),
  totalTracks: faker.number.int({ min: 5, max: 20 }),
  artists: [backlogArtist()],
  date: date.future().toISOString(),
}));

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

export const futureListenAlbum = createFactory<FutureListenAlbum>(() => ({
  spotifyId: uuid(),
  name: music.songName(),
  imageUrl: url(),
  artists: [artist()],
}));

export const getFutureListensResponse = ({
  n = 7,
  startDate = new Date(),
}): GetFutureListensResponse => {
  const listens: FutureListenItem[] = [];

  // Create n days of listens, from oldest to newest (ending at startDate)
  for (let i = n - 1; i >= 0; i--) {
    listens.push(
      futureListenItem({ date: addDays(startDate, i).toISOString() }),
    );
  }

  return { items: listens };
};

export const futureListenItem = createFactory<FutureListenItem>(() => ({
  id: uuid(),
  date: faker.date.future().toISOString(),
  album: futureListenAlbum(),
}));
