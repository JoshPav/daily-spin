import type { Account } from '@prisma/client';
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

import type { AlbumListenInput } from '~~/server/repositories/dailyListen.repository';
import type { GetListensResponse } from '~~/shared/schema';
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
import { mockGetAccessToken } from '~~/tests/mocks/authMock';
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

    // Mock BetterAuth to return the user's access token
    mockGetAccessToken.mockResolvedValue({
      accessToken: userAccount.accessToken,
    });

    handler = (await import('./index.get')).default;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  const getExpectedAlbum = (albumInput: AlbumListenInput) =>
    expect.objectContaining({
      id: expect.any(String),
      album: {
        albumId: albumInput.album.spotifyId,
        albumName: albumInput.album.name,
        imageUrl: albumInput.album.imageUrl ?? '',
        releaseDate: albumInput.album.releaseDate ?? null,
        artists: albumInput.album.artists.map(({ spotifyId, name }) => ({
          name,
          spotifyId,
        })),
      },
      listenMetadata: {
        listenMethod: albumInput.listenMethod ?? 'spotify',
        listenOrder: albumInput.listenOrder ?? 'ordered',
        listenTime: albumInput.listenTime ?? null,
      },
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
          startDate: toDateString(day1),
          endDate: toDateString(day2),
        },
      }),
    );

    // Then
    expect(result).toHaveLength(3);
    expect(result).toEqual([
      {
        date: toDateString(day1),
        albums: [getExpectedAlbum(album1)],
        favoriteSong: null,
      },
      {
        date: '2026-01-11',
        albums: [],
        favoriteSong: null,
      },
      {
        date: toDateString(day2),
        albums: [getExpectedAlbum(album2)],
        favoriteSong: null,
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
          startDate: toDateString(day),
          endDate: toDateString(day),
        },
      }),
    );

    // Then
    expect(result).toHaveLength(1);
    expect(result[0].albums).toHaveLength(2);
    expect(result[0]).toEqual({
      date: toDateString(day),
      albums: [getExpectedAlbum(album1), getExpectedAlbum(album2)],
      favoriteSong: null,
    });
  });

  describe('auto-fetch today', () => {
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
            startDate: toDateString(startDate),
            endDate: toDateString(endDate),
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
            startDate: toDateString(startDate),
            endDate: toDateString(endDate),
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
            startDate: toDateString(startOfToday),
            endDate: toDateString(startOfToday),
          },
        }),
      );

      // Then
      expect(mockGetRecentlyPlayedTracks).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].albums).toHaveLength(1);
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
            startDate: toDateString(startDate),
            endDate: toDateString(endDate),
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
            startDate: toDateString(startDate),
            endDate: toDateString(endDate),
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
          startDate: toDateString(day),
          endDate: toDateString(day),
        },
      }),
    );

    // Then
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: toDateString(day),
      albums: [getExpectedAlbum(mainUserAlbum)],
      favoriteSong: null,
    });
  });
});
