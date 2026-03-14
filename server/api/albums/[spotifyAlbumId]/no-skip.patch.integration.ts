import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { ToggleNoSkipResponse } from '#shared/schema';
import {
  createDailyListens,
  createNoSkipAlbum,
  createUser,
  getNoSkipAlbumsForUser,
} from '~~/tests/db/utils';
import { createHandlerEvent } from '~~/tests/factories/api.factory';
import { albumListenInput } from '~~/tests/factories/prisma.factory';
import type { EventHandler } from '~~/tests/mocks/nitroMock';

describe('PATCH /api/albums/[spotifyAlbumId]/no-skip Integration Tests', () => {
  let userId: string;
  let handler: EventHandler<ToggleNoSkipResponse>;

  beforeAll(async () => {
    handler = (await import('./no-skip.patch')).default;
  });

  beforeEach(async () => {
    const user = await createUser();
    userId = user.id;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should mark an album as no-skip', async () => {
    // Given
    const dailyListen = await createDailyListens({
      userId,
      date: new Date('2026-01-15'),
      albumListen: albumListenInput(),
    });
    const spotifyAlbumId = dailyListen.albums[0].album.spotifyId;

    // When
    const result = await handler(
      createHandlerEvent(userId, {
        params: { spotifyAlbumId },
        body: { noSkip: true },
      }),
    );

    // Then
    expect(result).toEqual({ noSkip: true });

    const saved = await getNoSkipAlbumsForUser(userId);
    expect(saved).toHaveLength(1);
    expect(saved[0].album.spotifyId).toBe(spotifyAlbumId);
  });

  it('should unmark an album as no-skip', async () => {
    // Given
    const dailyListen = await createDailyListens({
      userId,
      date: new Date('2026-01-15'),
      albumListen: albumListenInput(),
    });
    const spotifyAlbumId = dailyListen.albums[0].album.spotifyId;

    await createNoSkipAlbum({ userId, spotifyAlbumId });

    // When
    const result = await handler(
      createHandlerEvent(userId, {
        params: { spotifyAlbumId },
        body: { noSkip: false },
      }),
    );

    // Then
    expect(result).toEqual({ noSkip: false });

    const saved = await getNoSkipAlbumsForUser(userId);
    expect(saved).toHaveLength(0);
  });

  it('should be idempotent when marking no-skip twice', async () => {
    // Given
    const dailyListen = await createDailyListens({
      userId,
      date: new Date('2026-01-15'),
      albumListen: albumListenInput(),
    });
    const spotifyAlbumId = dailyListen.albums[0].album.spotifyId;

    // When
    await handler(
      createHandlerEvent(userId, {
        params: { spotifyAlbumId },
        body: { noSkip: true },
      }),
    );
    const result = await handler(
      createHandlerEvent(userId, {
        params: { spotifyAlbumId },
        body: { noSkip: true },
      }),
    );

    // Then
    expect(result).toEqual({ noSkip: true });

    const saved = await getNoSkipAlbumsForUser(userId);
    expect(saved).toHaveLength(1);
  });

  it('should be a no-op when unmarking an album that is not no-skip', async () => {
    // Given
    const dailyListen = await createDailyListens({
      userId,
      date: new Date('2026-01-15'),
      albumListen: albumListenInput(),
    });
    const spotifyAlbumId = dailyListen.albums[0].album.spotifyId;

    // When
    const result = await handler(
      createHandlerEvent(userId, {
        params: { spotifyAlbumId },
        body: { noSkip: false },
      }),
    );

    // Then
    expect(result).toEqual({ noSkip: false });

    const saved = await getNoSkipAlbumsForUser(userId);
    expect(saved).toHaveLength(0);
  });

  it("should not affect another user's no-skip status for the same album", async () => {
    // Given
    const otherUser = await createUser();
    const dailyListen = await createDailyListens({
      userId,
      date: new Date('2026-01-15'),
      albumListen: albumListenInput(),
    });
    const spotifyAlbumId = dailyListen.albums[0].album.spotifyId;

    await createNoSkipAlbum({ userId: otherUser.id, spotifyAlbumId });

    // When - main user marks the album as no-skip
    await handler(
      createHandlerEvent(userId, {
        params: { spotifyAlbumId },
        body: { noSkip: true },
      }),
    );

    // Then - other user's record is unaffected
    const otherUserSaved = await getNoSkipAlbumsForUser(otherUser.id);
    expect(otherUserSaved).toHaveLength(1);
  });

  it('should return 404 for an unknown album', async () => {
    // When/Then
    await expect(
      handler(
        createHandlerEvent(userId, {
          params: { spotifyAlbumId: 'unknown-spotify-id' },
          body: { noSkip: true },
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Album not found',
    });
  });

  it('should return 400 when body is invalid', async () => {
    // When/Then
    await expect(
      handler(
        createHandlerEvent(userId, {
          params: { spotifyAlbumId: 'some-album-id' },
          // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input
          body: { noSkip: 'yes' } as any,
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
