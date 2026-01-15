import { faker } from '@faker-js/faker';
import type {
  AddAlbumListenBody,
  AddBacklogItemBody,
  Album,
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
    body?: Record<string, unknown>;
    query?: Record<string, string>;
    params?: Record<string, string>;
  },
) =>
  handlerEvent({
    _requestBody: JSON.stringify(body),
    _path: `/path${query ? `?${new URLSearchParams(query).toString()}` : ''}`,
    _routerParams: params,
    context: { userId },
  });

const handlerEvent = createFactory<HandlerEvent>(() => ({}) as HandlerEvent);

export const album = createFactory<Album>(() => ({
  albumId: uuid(),
  albumName: music.songName(),
  artistNames: music.artist(),
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

export const addBacklogItemBody = createFactory<AddBacklogItemBody>(() => ({
  type: 'album',
  spotifyId: uuid(),
  name: music.songName(),
  imageUrl: url(),
  artistNames: music.artist(),
}));
