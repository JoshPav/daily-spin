import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type {
  AddAlbumListenBody,
  ListenMethod,
  ListenOrder,
  ListenTime,
} from '~~/shared/schema';
import { createUser, getAllListensForUser } from '~~/tests/db/utils';
import {
  addAlbumListenBody,
  album,
  createHandlerEvent,
  handlerEvent,
} from '~~/tests/factories/api.factory';
import type { EventHandler } from '~~/tests/mocks/nitroMock';

describe('POST /api/listens Integration Tests', () => {
  let userId: string;

  const today = new Date('2026-01-01T12:00:00.000Z');
  const startOfDay = new Date('2026-01-01T00:00:00.000Z');

  let handler: EventHandler;

  beforeAll(async () => {
    vi.setSystemTime(today);

    handler = (await import('./listens.post')).default;
  });

  beforeEach(async () => {
    userId = (await createUser()).id;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each<ListenMethod>([
    'spotify',
    'streamed',
    'vinyl',
  ])('should save album with $listenMethod listen method', async (listenMethod) => {
    // Given
    const body = addAlbumListenBody({ listenMetadata: { listenMethod } });

    // When
    await handler(createHandlerEvent(userId, { body }));

    // Then
    const savedListens = await getAllListensForUser(userId);

    expect(savedListens.length).toEqual(1);
    expect(savedListens[0].albums).toEqual([
      expect.objectContaining({
        albumId: body.album.albumId,
        listenTime: body.listenMetadata.listenTime,
      }),
    ]);
  });

  it.each<ListenOrder>([
    'interrupted',
    'ordered',
    'shuffled',
  ])('should save album with $listenOrder listen order', async (listenOrder) => {
    // Given
    const body = addAlbumListenBody({ listenMetadata: { listenOrder } });

    // When
    await handler(createHandlerEvent(userId, { body }));

    // Then
    const savedListens = await getAllListensForUser(userId);

    expect(savedListens.length).toEqual(1);
    expect(savedListens[0].albums).toEqual([
      expect.objectContaining({
        albumId: body.album.albumId,
        listenTime: body.listenMetadata.listenTime,
      }),
    ]);
  });

  it('should add multiple albums to the same day', async () => {
    // Given
    const body1: AddAlbumListenBody = addAlbumListenBody({
      album: album({ albumId: 'album-1', albumName: 'Album 1' }),
      date: startOfDay.toISOString(),
    });

    const body2: AddAlbumListenBody = addAlbumListenBody({
      album: album({ albumId: 'album-2', albumName: 'Album 2' }),
      date: startOfDay.toISOString(),
    });

    // When
    await handler(createHandlerEvent(userId, { body: body1 }));
    await handler(createHandlerEvent(userId, { body: body2 }));

    // Then
    const savedListens = await getAllListensForUser(userId);

    expect(savedListens).toMatchObject([
      {
        userId,
        date: startOfDay,
        albums: expect.arrayContaining([
          expect.objectContaining({
            albumId: body1.album.albumId,
            albumName: body1.album.albumName,
            listenTime: body1.listenMetadata.listenTime,
          }),
          expect.objectContaining({
            albumId: body2.album.albumId,
            albumName: body2.album.albumName,
            listenTime: body2.listenMetadata.listenTime,
          }),
        ]),
      },
    ]);
  });

  it('should save albums for different days separately', async () => {
    // Given
    const day1 = new Date('2026-01-01T00:00:00.000Z');
    const day2 = new Date('2026-01-02T00:00:00.000Z');

    const body1: AddAlbumListenBody = addAlbumListenBody({
      date: day1.toISOString(),
    });

    const body2: AddAlbumListenBody = addAlbumListenBody({
      date: day2.toISOString(),
    });

    // When
    await handler(createHandlerEvent(userId, { body: body1 }));
    await handler(createHandlerEvent(userId, { body: body2 }));

    // Then
    const listens = await getAllListensForUser(userId);
    expect(listens).toHaveLength(2);

    const isDay =
      (d: Date) =>
      ({ date }: { date: Date }) =>
        d.valueOf() === date.valueOf();

    const day1Listens = listens.filter(isDay(day1));
    expect(day1Listens.length).toEqual(1);
    expect(day1Listens[0].albums).toEqual([
      expect.objectContaining({
        albumId: body1.album.albumId,
        listenTime: body1.listenMetadata.listenTime,
      }),
    ]);

    const day2Listens = listens.filter(isDay(day2));
    expect(day2Listens.length).toEqual(1);
    expect(day2Listens[0].albums).toEqual([
      expect.objectContaining({
        albumId: body2.album.albumId,
        listenTime: body2.listenMetadata.listenTime,
      }),
    ]);
  });

  describe('listenTime', () => {
    it.each<ListenTime>([
      'morning',
      'noon',
      'evening',
      'night',
    ])('should save album with $listenTime listen time', async (listenTime) => {
      // Given
      const body = addAlbumListenBody({ listenMetadata: { listenTime } });

      // When
      await handler(createHandlerEvent(userId, { body }));

      // Then
      const savedListens = await getAllListensForUser(userId);

      expect(savedListens.length).toEqual(1);
      expect(savedListens[0].albums).toEqual([
        expect.objectContaining({
          albumId: body.album.albumId,
          listenTime: body.listenMetadata.listenTime,
        }),
      ]);
    });

    it('should save album listen with null listen time', async () => {
      // Given
      const body: AddAlbumListenBody = addAlbumListenBody({
        listenMetadata: {
          listenTime: null,
          listenMethod: 'spotify',
          listenOrder: 'ordered',
        },
      });

      // When
      await handler(handlerEvent(createHandlerEvent(userId, { body })));

      // Then
      const savedListens = await getAllListensForUser(userId);

      expect(savedListens.length).toEqual(1);
      expect(savedListens[0].albums).toEqual([
        expect.objectContaining({
          albumId: body.album.albumId,
          listenTime: body.listenMetadata.listenTime,
        }),
      ]);
    });
  });
});
