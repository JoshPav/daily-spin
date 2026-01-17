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
  ListenMetadata,
} from '~~/shared/schema';
import { createFactory } from './factory';

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
}));

export const dailyAlbumListen = createFactory<DailyAlbumListen>(() => ({
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
  id: 'album-1',
  spotifyId: 'spotify-1',
  name: 'Test Album',
  imageUrl: 'https://example.com/image.jpg',
  artists: [{ name: 'Test Artist', spotifyId: 'artist-1' }],
  addedAt: new Date('2026-01-10T12:00:00.000Z').toISOString(),
  ...overrides,
});
