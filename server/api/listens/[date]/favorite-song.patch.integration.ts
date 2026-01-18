import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { UpdateFavoriteSong } from '#shared/schema';
import {
  createDailyListens,
  createUser,
  getAllListensForUser,
} from '~~/tests/db/utils';
import { createHandlerEvent } from '~~/tests/factories/api.factory';
import { albumListenInput } from '~~/tests/factories/prisma.factory';
import type { EventHandler } from '~~/tests/mocks/nitroMock';

describe('PATCH /api/listens/[date]/favorite-song Integration Tests', () => {
  let userId: string;
  let handler: EventHandler<UpdateFavoriteSong['response']>;

  beforeAll(async () => {
    handler = (await import('./favorite-song.patch')).default;
  });

  beforeEach(async () => {
    userId = (await createUser()).id;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should set a favorite song successfully', async () => {
    // Given
    const date = new Date('2026-01-15');
    const dailyListen = await createDailyListens({
      userId,
      date,
      albumListen: albumListenInput(),
    });
    const spotifyAlbumId = dailyListen.albums[0].album.spotifyId;
    const internalAlbumId = dailyListen.albums[0].albumId;

    const favoriteSong = {
      spotifyId: 'track-123',
      name: 'My Favorite Track',
      trackNumber: 5,
      albumId: spotifyAlbumId,
    };

    // When
    const result = await handler(
      createHandlerEvent(userId, {
        params: { date: '2026-01-15' },
        body: favoriteSong,
      }),
    );

    // Then
    expect(result.favoriteSong).toEqual(favoriteSong);

    // Verify in database (uses internal album ID)
    const [savedListen] = await getAllListensForUser(userId);
    expect(savedListen.favoriteSongId).toBe('track-123');
    expect(savedListen.favoriteSongName).toBe('My Favorite Track');
    expect(savedListen.favoriteSongTrackNumber).toBe(5);
    expect(savedListen.favoriteSongAlbumId).toBe(internalAlbumId);
  });

  it('should clear a favorite song successfully', async () => {
    // Given - create listen with existing favorite song
    const date = new Date('2026-01-15');
    const dailyListen = await createDailyListens({
      userId,
      date,
      albumListen: albumListenInput(),
    });
    const spotifyAlbumId = dailyListen.albums[0].album.spotifyId;

    // First set a favorite song
    await handler(
      createHandlerEvent(userId, {
        params: { date: '2026-01-15' },
        body: {
          spotifyId: 'track-123',
          name: 'Some Track',
          trackNumber: 1,
          albumId: spotifyAlbumId,
        },
      }),
    );

    // When - clear the favorite song
    const result = await handler(
      createHandlerEvent(userId, {
        params: { date: '2026-01-15' },
        body: { spotifyId: null },
      }),
    );

    // Then
    expect(result.favoriteSong).toBeNull();

    // Verify in database
    const [savedListen] = await getAllListensForUser(userId);
    expect(savedListen.favoriteSongId).toBeNull();
    expect(savedListen.favoriteSongName).toBeNull();
    expect(savedListen.favoriteSongTrackNumber).toBeNull();
    expect(savedListen.favoriteSongAlbumId).toBeNull();
  });

  it('should update an existing favorite song', async () => {
    // Given
    const date = new Date('2026-01-15');
    const dailyListen = await createDailyListens({
      userId,
      date,
      albumListen: albumListenInput(),
    });
    const spotifyAlbumId = dailyListen.albums[0].album.spotifyId;

    // Set initial favorite song
    await handler(
      createHandlerEvent(userId, {
        params: { date: '2026-01-15' },
        body: {
          spotifyId: 'track-1',
          name: 'First Choice',
          trackNumber: 1,
          albumId: spotifyAlbumId,
        },
      }),
    );

    // When - update to different song
    const newFavorite = {
      spotifyId: 'track-2',
      name: 'Second Choice',
      trackNumber: 7,
      albumId: spotifyAlbumId,
    };
    const result = await handler(
      createHandlerEvent(userId, {
        params: { date: '2026-01-15' },
        body: newFavorite,
      }),
    );

    // Then
    expect(result.favoriteSong).toEqual(newFavorite);

    // Verify in database
    const [savedListen] = await getAllListensForUser(userId);
    expect(savedListen.favoriteSongId).toBe('track-2');
    expect(savedListen.favoriteSongName).toBe('Second Choice');
    expect(savedListen.favoriteSongTrackNumber).toBe(7);
  });

  it('should return 404 when daily listen does not exist', async () => {
    // Given
    const nonExistentDate = '2026-12-31';

    // When/Then
    await expect(
      handler(
        createHandlerEvent(userId, {
          params: { date: nonExistentDate },
          body: {
            spotifyId: 'track-123',
            name: 'Track',
            trackNumber: 1,
            albumId: 'album-123',
          },
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Daily listen not found',
    });
  });

  it('should return 404 when daily listen belongs to different user', async () => {
    // Given
    const otherUser = await createUser();
    const date = new Date('2026-01-15');
    const dailyListen = await createDailyListens({
      userId: otherUser.id,
      date,
      albumListen: albumListenInput(),
    });
    const spotifyAlbumId = dailyListen.albums[0].album.spotifyId;

    // When/Then
    await expect(
      handler(
        createHandlerEvent(userId, {
          params: { date: '2026-01-15' },
          body: {
            spotifyId: 'track-123',
            name: 'Track',
            trackNumber: 1,
            albumId: spotifyAlbumId,
          },
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Daily listen not found',
    });

    // Verify original listen is unchanged
    const [otherUserListen] = await getAllListensForUser(otherUser.id);
    expect(otherUserListen.favoriteSongId).toBeNull();
  });

  it('should return 400 when date param is missing', async () => {
    // When/Then
    await expect(
      handler(
        createHandlerEvent(userId, {
          params: {},
          body: {
            spotifyId: 'track-123',
            name: 'Track',
            trackNumber: 1,
            albumId: 'album-123',
          },
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Missing date parameter',
    });
  });

  it('should return 400 when date format is invalid', async () => {
    // When/Then
    await expect(
      handler(
        createHandlerEvent(userId, {
          params: { date: 'invalid-date' },
          body: {
            spotifyId: 'track-123',
            name: 'Track',
            trackNumber: 1,
            albumId: 'album-123',
          },
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid date format',
    });
  });

  it('should return 400 when body is missing required fields', async () => {
    // Given
    const date = new Date('2026-01-15');
    await createDailyListens({
      userId,
      date,
      albumListen: albumListenInput(),
    });

    // When/Then - missing albumId
    await expect(
      handler(
        createHandlerEvent(userId, {
          params: { date: '2026-01-15' },
          body: {
            spotifyId: 'track-123',
            name: 'Track',
            trackNumber: 1,
            // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input
          } as any,
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        'Missing required fields: spotifyId, name, trackNumber, and albumId are required',
    });
  });
});
