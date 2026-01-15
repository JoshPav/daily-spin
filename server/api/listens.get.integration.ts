import type { Account, Prisma } from '@prisma/client';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { DailyAlbumListen, GetListensResponse } from '~~/shared/schema';
import {
  createBacklogItem,
  createDailyListens,
  createUser,
  getBacklogItemsForUser,
} from '~~/tests/db/utils';
import { createHandlerEvent } from '~~/tests/factories/api.factory';
import { albumListenInput } from '~~/tests/factories/prisma.factory';
import {
  createFullAlbumPlayHistory,
  recentlyPlayed,
} from '~~/tests/factories/spotify.factory';
import { mockRuntimeConfig } from '~~/tests/integration.setup';
import type { EventHandler } from '~~/tests/mocks/nitroMock';
import {
  mockSpotifyApi,
  mockWithAccessToken,
} from '~~/tests/mocks/spotifyMock';

describe('GET /api/listens Integration Tests', () => {
  let userId: string;
  let userAccount: Account;

  const mockGetRecentlyPlayedTracks = vi.mocked(
    mockSpotifyApi.player.getRecentlyPlayedTracks,
  );

  const today = new Date('2026-01-15T12:00:00.000Z');
  const startOfToday = new Date('2026-01-15T00:00:00.000Z');

  const spotifyClientId = 'test-spotify-client-id';

  let handler: EventHandler<GetListensResponse>;

  beforeAll(async () => {
    vi.setSystemTime(today);
    mockRuntimeConfig.spotifyClientId = spotifyClientId;
  });

  beforeEach(async () => {
    // Create a test user
    const user = await createUser();
    userId = user.id;
    userAccount = user.accounts[0];

    handler = (await import('./listens.get')).default;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  const getExpectedAlbum = (
    dbAlbum: Omit<Prisma.AlbumListenOldCreateInput, 'dailyListen'>,
  ): DailyAlbumListen => ({
    album: {
      albumId: dbAlbum.albumId,
      albumName: dbAlbum.albumName,
      imageUrl: dbAlbum.imageUrl,
      artistNames: dbAlbum.artistNames,
    },
    listenMetadata: expect.objectContaining({
      listenMethod: dbAlbum.listenMethod,
      listenOrder: dbAlbum.listenOrder,
      listenTime: dbAlbum.listenTime,
    }),
  });

  it('should return listens for a date range, with missing dates filled in', async () => {
    // Given
    const album1 = albumListenInput();
    const day1 = new Date('2026-01-10T00:00:00.000Z');
    await createDailyListens({ userId, date: day1, albumListen: album1 });

    const album2 = albumListenInput();
    const day2 = new Date('2026-01-12T00:00:00.000Z');
    await createDailyListens({ userId, date: day2, albumListen: album2 });

    // When
    const result = await handler(
      createHandlerEvent(userId, {
        query: {
          startDate: day1.toISOString(),
          endDate: day2.toISOString(),
        },
      }),
    );

    // Then
    expect(result).toHaveLength(3);
    expect(result).toEqual([
      {
        date: day1.toISOString(),
        albums: [getExpectedAlbum(album1)],
      },
      {
        date: '2026-01-11T00:00:00.000Z',
        albums: [],
      },
      {
        date: day2.toISOString(),
        albums: [getExpectedAlbum(album2)],
      },
    ]);
  });

  it('should return multiple albums for the same day', async () => {
    // Given
    const day = new Date('2026-01-10T00:00:00.000Z');

    const album1 = albumListenInput({ listenTime: 'morning' });
    const album2 = albumListenInput({ listenTime: 'evening' });

    await createDailyListens({
      userId,
      date: day,
      albumListens: [album1, album2],
    });

    // When
    const result = await handler(
      createHandlerEvent(userId, {
        query: {
          startDate: day.toISOString(),
          endDate: day.toISOString(),
        },
      }),
    );

    // Then
    expect(result).toHaveLength(1);
    expect(result[0].albums).toHaveLength(2);
    expect(result[0]).toEqual({
      date: day.toISOString(),
      albums: [getExpectedAlbum(album1), getExpectedAlbum(album2)],
    });
  });

  describe('auto-fetch today', () => {
    afterEach(() => {
      delete mockRuntimeConfig.disableAutoFetch;
    });

    it('should auto-fetch today when today is in range and missing', async () => {
      // Given
      const { album: spotifyAlbum, history } = createFullAlbumPlayHistory({
        date: '2026-01-15',
      });

      mockGetRecentlyPlayedTracks.mockResolvedValue(
        recentlyPlayed({ items: history }),
      );

      const startDate = new Date('2026-01-14T00:00:00.000Z');
      const endDate = new Date('2026-01-15T23:59:59.999Z');

      // When
      const result = await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        }),
      );

      // Then
      expect(mockWithAccessToken).toHaveBeenCalledWith(spotifyClientId, {
        access_token: userAccount.accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: userAccount.refreshToken,
      });
      expect(mockGetRecentlyPlayedTracks).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[1].albums).toHaveLength(1);
      expect(result[1].albums[0].album.albumId).toBe(spotifyAlbum.id);
    });

    it('should not auto-fetch if today is not in range', async () => {
      // Given
      const startDate = new Date('2026-01-10T00:00:00.000Z');
      const endDate = new Date('2026-01-12T00:00:00.000Z');

      // When
      const result = await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        }),
      );

      // Then
      expect(mockGetRecentlyPlayedTracks).not.toHaveBeenCalled();
      expect(result).toHaveLength(3);
    });

    it('should not auto-fetch if today already exists in database', async () => {
      // Given
      const existingAlbum = albumListenInput();
      await createDailyListens({
        userId,
        date: startOfToday,
        albumListen: existingAlbum,
      });

      // When
      const result = await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: startOfToday.toISOString(),
            endDate: startOfToday.toISOString(),
          },
        }),
      );

      // Then
      expect(mockGetRecentlyPlayedTracks).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].albums).toHaveLength(1);
    });

    it('should not auto-fetch when disableAutoFetch is true', async () => {
      // Given
      mockRuntimeConfig.disableAutoFetch = 'true';

      const startDate = new Date('2026-01-14T00:00:00.000Z');
      const endDate = new Date('2026-01-15T23:59:59.999Z');

      // When
      const result = await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        }),
      );

      // Then
      expect(mockGetRecentlyPlayedTracks).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[1].albums).toEqual([]);
    });

    it('should handle auto-fetch returning no albums', async () => {
      // Given
      mockGetRecentlyPlayedTracks.mockResolvedValue(
        recentlyPlayed({ items: [] }),
      );

      const startDate = new Date('2026-01-14T00:00:00.000Z');
      const endDate = new Date('2026-01-15T23:59:59.999Z');

      // When
      const result = await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        }),
      );

      // Then
      expect(mockGetRecentlyPlayedTracks).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[1].albums).toEqual([]);
    });

    it('should remove album from backlog when auto-fetched', async () => {
      // Given
      const { album: spotifyAlbum, history } = createFullAlbumPlayHistory({
        date: '2026-01-15',
      });

      // Add the album to user's backlog
      await createBacklogItem({
        userId,
        item: {
          spotifyId: spotifyAlbum.id,
          name: spotifyAlbum.name,
          artists: [
            {
              spotifyId: spotifyAlbum.artists[0].id,
              name: spotifyAlbum.artists[0].name,
            },
          ],
        },
      });

      // Verify backlog item exists
      const backlogBefore = await getBacklogItemsForUser(userId);
      expect(backlogBefore).toHaveLength(1);

      mockGetRecentlyPlayedTracks.mockResolvedValue(
        recentlyPlayed({ items: history }),
      );

      const startDate = new Date('2026-01-14T00:00:00.000Z');
      const endDate = new Date('2026-01-15T23:59:59.999Z');

      // When
      await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        }),
      );

      // Then
      const backlogAfter = await getBacklogItemsForUser(userId);
      expect(backlogAfter).toHaveLength(0);
    });
  });

  it('should only return listens for the specified user', async () => {
    // Given
    const otherUser = await createUser();

    const day = new Date('2026-01-10T00:00:00.000Z');

    const mainUserAlbum = albumListenInput();
    await createDailyListens({ userId, date: day, albumListen: mainUserAlbum });

    const otherUserAlbum = albumListenInput();
    await createDailyListens({
      userId: otherUser.id,
      date: day,
      albumListen: otherUserAlbum,
    });

    // When
    const result = await handler(
      createHandlerEvent(userId, {
        query: {
          startDate: day.toISOString(),
          endDate: day.toISOString(),
        },
      }),
    );

    // Then
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: day.toISOString(),
      albums: [getExpectedAlbum(mainUserAlbum)],
    });
  });
});
