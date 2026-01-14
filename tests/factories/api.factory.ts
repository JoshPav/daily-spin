import { faker } from '@faker-js/faker';
import type {
  AddAlbumListenBody,
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

export const handlerEvent = createFactory<HandlerEvent>(
  () => ({}) as HandlerEvent,
);

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
