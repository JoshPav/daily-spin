import { format } from 'date-fns';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

/** Formats a Date to YYYY-MM-DD string */
const toDateString = (d: Date): string => format(d, 'yyyy-MM-dd');

import type {
  AddAlbumListenBody,
  ListenMethod,
  ListenOrder,
  ListenTime,
} from '~~/shared/schema';
import {
  createBacklogItem,
  createScheduledListen,
  createUser,
  getAllListensForUser,
  getBacklogItemsForUser,
  getScheduledListensForUser,
} from '~~/tests/db/utils';
import {
  addAlbumListenBody,
  album,
  createHandlerEvent,
} from '~~/tests/factories/api.factory';
import type { EventHandler } from '~~/tests/mocks/nitroMock';

describe('POST /api/listens Integration Tests', () => {
  let userId: string;

  const startOfDay = new Date('2026-01-01T00:00:00.000Z');

  let handler: EventHandler;

  beforeAll(async () => {
    handler = (await import('./index.post')).default;
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
        album: expect.objectContaining({
          spotifyId: body.album.albumId,
        }),
        listenMethod,
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
        album: expect.objectContaining({
          spotifyId: body.album.albumId,
        }),
        listenOrder,
        listenTime: body.listenMetadata.listenTime,
      }),
    ]);
  });

  it('should add multiple albums to the same day', async () => {
    // Given
    const body1: AddAlbumListenBody = addAlbumListenBody({
      album: album({ albumId: 'album-1', albumName: 'Album 1' }),
      date: toDateString(startOfDay),
    });

    const body2: AddAlbumListenBody = addAlbumListenBody({
      album: album({ albumId: 'album-2', albumName: 'Album 2' }),
      date: toDateString(startOfDay),
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
            album: expect.objectContaining({
              spotifyId: body1.album.albumId,
              name: body1.album.albumName,
            }),
            listenTime: body1.listenMetadata.listenTime,
          }),
          expect.objectContaining({
            album: expect.objectContaining({
              spotifyId: body2.album.albumId,
              name: body2.album.albumName,
            }),
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
      date: toDateString(day1),
    });

    const body2: AddAlbumListenBody = addAlbumListenBody({
      date: toDateString(day2),
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
        album: expect.objectContaining({
          spotifyId: body1.album.albumId,
        }),
        listenTime: body1.listenMetadata.listenTime,
      }),
    ]);

    const day2Listens = listens.filter(isDay(day2));
    expect(day2Listens.length).toEqual(1);
    expect(day2Listens[0].albums).toEqual([
      expect.objectContaining({
        album: expect.objectContaining({
          spotifyId: body2.album.albumId,
        }),
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
          album: expect.objectContaining({
            spotifyId: body.album.albumId,
          }),
          listenTime,
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
      await handler(createHandlerEvent(userId, { body }));

      // Then
      const savedListens = await getAllListensForUser(userId);

      expect(savedListens.length).toEqual(1);
      expect(savedListens[0].albums).toEqual([
        expect.objectContaining({
          album: expect.objectContaining({
            spotifyId: body.album.albumId,
          }),
          listenTime: null,
        }),
      ]);
    });
  });

  describe('backlog cleanup', () => {
    it('should remove album from backlog when listened to', async () => {
      // Given
      const albumSpotifyId = 'album-to-listen';
      await createBacklogItem({
        userId,
        item: {
          spotifyId: albumSpotifyId,
          name: 'Backlog Album',
          artists: [{ spotifyId: 'artist-1', name: 'Artist One' }],
        },
      });

      // Verify backlog item exists
      const backlogBefore = await getBacklogItemsForUser(userId);
      expect(backlogBefore).toHaveLength(1);

      const body = addAlbumListenBody({
        album: album({ albumId: albumSpotifyId }),
      });

      // When
      await handler(createHandlerEvent(userId, { body }));

      // Then
      const backlogAfter = await getBacklogItemsForUser(userId);
      expect(backlogAfter).toHaveLength(0);
    });

    it('should not affect backlog when listening to album not in backlog', async () => {
      // Given
      await createBacklogItem({
        userId,
        item: {
          spotifyId: 'different-album',
          name: 'Different Album',
          artists: [{ spotifyId: 'artist-1', name: 'Artist One' }],
        },
      });

      const body = addAlbumListenBody({
        album: album({ albumId: 'listened-album' }),
      });

      // When
      await handler(createHandlerEvent(userId, { body }));

      // Then
      const backlogAfter = await getBacklogItemsForUser(userId);
      expect(backlogAfter).toHaveLength(1);
      expect(backlogAfter[0].album.spotifyId).toBe('different-album');
    });

    it('should only remove backlog item for the current user', async () => {
      // Given
      const otherUser = await createUser();
      const albumSpotifyId = 'shared-album';

      // Both users have the same album in backlog
      await createBacklogItem({
        userId,
        item: {
          spotifyId: albumSpotifyId,
          name: 'Shared Album',
          artists: [{ spotifyId: 'artist-1', name: 'Artist One' }],
        },
      });
      await createBacklogItem({
        userId: otherUser.id,
        item: {
          spotifyId: albumSpotifyId,
          name: 'Shared Album',
          artists: [{ spotifyId: 'artist-1', name: 'Artist One' }],
        },
      });

      const body = addAlbumListenBody({
        album: album({ albumId: albumSpotifyId }),
      });

      // When - current user listens to the album
      await handler(createHandlerEvent(userId, { body }));

      // Then - only current user's backlog is cleaned
      const currentUserBacklog = await getBacklogItemsForUser(userId);
      expect(currentUserBacklog).toHaveLength(0);

      const otherUserBacklog = await getBacklogItemsForUser(otherUser.id);
      expect(otherUserBacklog).toHaveLength(1);
    });
  });

  describe('scheduled listen cleanup', () => {
    it('should remove album from scheduled listens when listened to', async () => {
      // Given
      const albumSpotifyId = 'scheduled-album';
      const scheduledDate = new Date('2026-01-15T00:00:00.000Z');

      await createScheduledListen({
        userId,
        item: {
          spotifyId: albumSpotifyId,
          name: 'Scheduled Album',
          artists: [{ spotifyId: 'artist-1', name: 'Artist One' }],
          date: scheduledDate,
        },
      });

      // Verify scheduled listen exists
      const scheduledListensBefore = await getScheduledListensForUser(userId);
      expect(scheduledListensBefore).toHaveLength(1);

      const body = addAlbumListenBody({
        album: album({ albumId: albumSpotifyId }),
      });

      // When
      await handler(createHandlerEvent(userId, { body }));

      // Then
      const scheduledListensAfter = await getScheduledListensForUser(userId);
      expect(scheduledListensAfter).toHaveLength(0);
    });

    it('should not affect scheduled listens when listening to album not scheduled', async () => {
      // Given
      const scheduledDate = new Date('2026-01-15T00:00:00.000Z');

      await createScheduledListen({
        userId,
        item: {
          spotifyId: 'different-album',
          name: 'Different Album',
          artists: [{ spotifyId: 'artist-1', name: 'Artist One' }],
          date: scheduledDate,
        },
      });

      const body = addAlbumListenBody({
        album: album({ albumId: 'listened-album' }),
      });

      // When
      await handler(createHandlerEvent(userId, { body }));

      // Then
      const scheduledListensAfter = await getScheduledListensForUser(userId);
      expect(scheduledListensAfter).toHaveLength(1);
      expect(scheduledListensAfter[0].album.spotifyId).toBe('different-album');
    });

    it('should only remove scheduled listen for the current user', async () => {
      // Given
      const otherUser = await createUser();
      const albumSpotifyId = 'shared-scheduled-album';
      const scheduledDate = new Date('2026-01-15T00:00:00.000Z');

      // Both users have the same album scheduled
      await createScheduledListen({
        userId,
        item: {
          spotifyId: albumSpotifyId,
          name: 'Shared Scheduled Album',
          artists: [{ spotifyId: 'artist-1', name: 'Artist One' }],
          date: scheduledDate,
        },
      });
      await createScheduledListen({
        userId: otherUser.id,
        item: {
          spotifyId: albumSpotifyId,
          name: 'Shared Scheduled Album',
          artists: [{ spotifyId: 'artist-1', name: 'Artist One' }],
          date: scheduledDate,
        },
      });

      const body = addAlbumListenBody({
        album: album({ albumId: albumSpotifyId }),
      });

      // When - current user listens to the album
      await handler(createHandlerEvent(userId, { body }));

      // Then - only current user's scheduled listen is removed
      const currentUserScheduledListens =
        await getScheduledListensForUser(userId);
      expect(currentUserScheduledListens).toHaveLength(0);

      const otherUserScheduledListens = await getScheduledListensForUser(
        otherUser.id,
      );
      expect(otherUserScheduledListens).toHaveLength(1);
    });
  });
});
