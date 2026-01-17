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

describe('PATCH /api/listens/[albumListenId]/favorite-song Integration Tests', () => {
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
    const dailyListen = await createDailyListens({
      userId,
      date: new Date('2026-01-15'),
      albumListen: albumListenInput(),
    });
    const albumListenId = dailyListen.albums[0].id;

    const favoriteSong = {
      spotifyId: 'track-123',
      name: 'My Favorite Track',
      trackNumber: 5,
    };

    // When
    const result = await handler(
      createHandlerEvent(userId, {
        params: { albumListenId },
        body: favoriteSong,
      }),
    );

    // Then
    expect(result.favoriteSong).toEqual(favoriteSong);

    // Verify in database
    const [savedListen] = await getAllListensForUser(userId);
    expect(savedListen.albums[0].favoriteSongId).toBe('track-123');
    expect(savedListen.albums[0].favoriteSongName).toBe('My Favorite Track');
    expect(savedListen.albums[0].favoriteSongTrackNumber).toBe(5);
  });

  it('should clear a favorite song successfully', async () => {
    // Given - create listen with existing favorite song
    const dailyListen = await createDailyListens({
      userId,
      date: new Date('2026-01-15'),
      albumListen: albumListenInput(),
    });
    const albumListenId = dailyListen.albums[0].id;

    // First set a favorite song
    await handler(
      createHandlerEvent(userId, {
        params: { albumListenId },
        body: { spotifyId: 'track-123', name: 'Some Track', trackNumber: 1 },
      }),
    );

    // When - clear the favorite song
    const result = await handler(
      createHandlerEvent(userId, {
        params: { albumListenId },
        body: { spotifyId: null },
      }),
    );

    // Then
    expect(result.favoriteSong).toBeNull();

    // Verify in database
    const [savedListen] = await getAllListensForUser(userId);
    expect(savedListen.albums[0].favoriteSongId).toBeNull();
    expect(savedListen.albums[0].favoriteSongName).toBeNull();
    expect(savedListen.albums[0].favoriteSongTrackNumber).toBeNull();
  });

  it('should update an existing favorite song', async () => {
    // Given
    const dailyListen = await createDailyListens({
      userId,
      date: new Date('2026-01-15'),
      albumListen: albumListenInput(),
    });
    const albumListenId = dailyListen.albums[0].id;

    // Set initial favorite song
    await handler(
      createHandlerEvent(userId, {
        params: { albumListenId },
        body: { spotifyId: 'track-1', name: 'First Choice', trackNumber: 1 },
      }),
    );

    // When - update to different song
    const newFavorite = {
      spotifyId: 'track-2',
      name: 'Second Choice',
      trackNumber: 7,
    };
    const result = await handler(
      createHandlerEvent(userId, {
        params: { albumListenId },
        body: newFavorite,
      }),
    );

    // Then
    expect(result.favoriteSong).toEqual(newFavorite);

    // Verify in database
    const [savedListen] = await getAllListensForUser(userId);
    expect(savedListen.albums[0].favoriteSongId).toBe('track-2');
    expect(savedListen.albums[0].favoriteSongName).toBe('Second Choice');
    expect(savedListen.albums[0].favoriteSongTrackNumber).toBe(7);
  });

  it('should return 404 when album listen does not exist', async () => {
    // Given
    const nonExistentId = 'non-existent-id';

    // When/Then
    await expect(
      handler(
        createHandlerEvent(userId, {
          params: { albumListenId: nonExistentId },
          body: { spotifyId: 'track-123', name: 'Track', trackNumber: 1 },
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Album listen not found',
    });
  });

  it('should return 404 when album listen belongs to different user', async () => {
    // Given
    const otherUser = await createUser();
    const dailyListen = await createDailyListens({
      userId: otherUser.id,
      date: new Date('2026-01-15'),
      albumListen: albumListenInput(),
    });
    const albumListenId = dailyListen.albums[0].id;

    // When/Then
    await expect(
      handler(
        createHandlerEvent(userId, {
          params: { albumListenId },
          body: { spotifyId: 'track-123', name: 'Track', trackNumber: 1 },
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Album listen not found',
    });

    // Verify original listen is unchanged
    const [otherUserListen] = await getAllListensForUser(otherUser.id);
    expect(otherUserListen.albums[0].favoriteSongId).toBeNull();
  });

  it('should return 400 when albumListenId param is missing', async () => {
    // When/Then
    await expect(
      handler(
        createHandlerEvent(userId, {
          params: {},
          body: { spotifyId: 'track-123', name: 'Track', trackNumber: 1 },
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Missing albumListenId parameter',
    });
  });

  it('should return 400 when body is missing required fields', async () => {
    // Given
    const dailyListen = await createDailyListens({
      userId,
      date: new Date('2026-01-15'),
      albumListen: albumListenInput(),
    });
    const albumListenId = dailyListen.albums[0].id;

    // When/Then - missing name and trackNumber
    await expect(
      handler(
        createHandlerEvent(userId, {
          params: { albumListenId },
          body: { spotifyId: 'track-123' } as any,
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Missing required fields: spotifyId, name, and trackNumber are required',
    });
  });
});
