import type { Account } from '@prisma/client';
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
import { mockRuntimeConfig } from '~~/tests/integration.setup';
import { mockGetAccessToken } from '~~/tests/mocks/authMock';
import type { EventHandler } from '~~/tests/mocks/nitroMock';
import {
  mockSpotifyApi,
  mockWithAccessToken,
} from '~~/tests/mocks/spotifyMock';
import prisma from '../../../clients/prisma';

describe('PATCH /api/listens/[date]/favorite-song Integration Tests', () => {
  let userId: string;
  let userAccount: Account;
  let handler: EventHandler<UpdateFavoriteSong['response']>;

  beforeAll(async () => {
    handler = (await import('./favorite-song.patch')).default;
    mockRuntimeConfig.spotifyClientId = 'test-spotify-client-id';
  });

  beforeEach(async () => {
    const user = await createUser();
    userId = user.id;
    userAccount = user.accounts[0];

    // Mock BetterAuth to return the user's access token
    mockGetAccessToken.mockResolvedValue({
      accessToken: userAccount.accessToken,
    });

    // Mock Spotify API responses
    vi.mocked(mockSpotifyApi.playlists.createPlaylist).mockResolvedValue({
      id: 'playlist-123',
      // biome-ignore lint/suspicious/noExplicitAny: Testing mock
    } as any);

    vi.mocked(mockSpotifyApi.playlists.getPlaylist).mockResolvedValue({
      id: 'playlist-123',
      // biome-ignore lint/suspicious/noExplicitAny: Testing mock
    } as any);

    vi.mocked(mockSpotifyApi.playlists.changePlaylistDetails).mockResolvedValue(
      // biome-ignore lint/suspicious/noExplicitAny: Testing mock
      {} as any,
    );

    vi.mocked(mockSpotifyApi.playlists.updatePlaylistItems).mockResolvedValue({
      snapshot_id: 'snapshot-123',
    });
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
    });
  });

  describe('Song of the Day Playlist Integration', () => {
    it('should create playlist when user selects first favorite song with feature enabled', async () => {
      // Given - enable the feature
      await prisma.user.update({
        where: { id: userId },
        data: { createSongOfDayPlaylist: true },
      });

      const date = new Date('2026-01-15');
      const dailyListen = await createDailyListens({
        userId,
        date,
        albumListen: albumListenInput(),
      });
      const spotifyAlbumId = dailyListen.albums[0].album.spotifyId;

      const favoriteSong = {
        spotifyId: 'track-123',
        name: 'My Favorite Track',
        trackNumber: 5,
        albumId: spotifyAlbumId,
      };

      // When
      await handler(
        createHandlerEvent(userId, {
          params: { date: '2026-01-15' },
          body: favoriteSong,
        }),
      );

      // Then - verify Spotify API was called
      expect(mockWithAccessToken).toHaveBeenCalledWith(
        'test-spotify-client-id',
        {
          access_token: userAccount.accessToken,
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: userAccount.refreshToken,
        },
      );

      expect(mockSpotifyApi.playlists.createPlaylist).toHaveBeenCalledWith(
        userAccount.accountId,
        {
          name: 'DailySpin - Song of the Day 2026',
          description: expect.stringContaining('Auto-generated by DailySpin'),
          public: false,
        },
      );

      expect(mockSpotifyApi.playlists.updatePlaylistItems).toHaveBeenCalledWith(
        'playlist-123',
        {
          uris: ['spotify:track:track-123'],
        },
      );

      // Verify playlist ID stored in database
      const userPlaylist = await prisma.userPlaylist.findUnique({
        where: {
          userId_playlistType: {
            userId,
            playlistType: 'song_of_the_day',
          },
        },
      });

      expect(userPlaylist).toBeDefined();
      expect(userPlaylist?.spotifyPlaylistId).toBe('playlist-123');
    });

    it('should not create playlist when feature is disabled', async () => {
      // Given - explicitly disable the feature
      await prisma.user.update({
        where: { id: userId },
        data: { createSongOfDayPlaylist: false },
      });

      const date = new Date('2026-01-15');
      const dailyListen = await createDailyListens({
        userId,
        date,
        albumListen: albumListenInput(),
      });
      const spotifyAlbumId = dailyListen.albums[0].album.spotifyId;

      const favoriteSong = {
        spotifyId: 'track-123',
        name: 'My Favorite Track',
        trackNumber: 5,
        albumId: spotifyAlbumId,
      };

      // When
      await handler(
        createHandlerEvent(userId, {
          params: { date: '2026-01-15' },
          body: favoriteSong,
        }),
      );

      // Then - Spotify API should not be called
      expect(mockSpotifyApi.playlists.createPlaylist).not.toHaveBeenCalled();
      expect(
        mockSpotifyApi.playlists.updatePlaylistItems,
      ).not.toHaveBeenCalled();

      // Verify no playlist created in database
      const userPlaylist = await prisma.userPlaylist.findUnique({
        where: {
          userId_playlistType: {
            userId,
            playlistType: 'song_of_the_day',
          },
        },
      });

      expect(userPlaylist).toBeNull();
    });

    it('should update playlist with all favorites when changing a song', async () => {
      // Given - feature enabled with multiple favorite songs
      await prisma.user.update({
        where: { id: userId },
        data: { createSongOfDayPlaylist: true },
      });

      // Create three daily listens with favorites
      const date1 = new Date('2026-01-10');
      const date2 = new Date('2026-01-15');
      const date3 = new Date('2026-01-20');

      for (const date of [date1, date2, date3]) {
        const dailyListen = await createDailyListens({
          userId,
          date,
          albumListen: albumListenInput(),
        });
        const spotifyAlbumId = dailyListen.albums[0].album.spotifyId;

        await handler(
          createHandlerEvent(userId, {
            params: { date: date.toISOString().split('T')[0] },
            body: {
              spotifyId: `track-${date.getDate()}`,
              name: `Track ${date.getDate()}`,
              trackNumber: 1,
              albumId: spotifyAlbumId,
            },
          }),
        );
      }

      // Clear mocks to check the final update
      vi.clearAllMocks();

      // Mock existing playlist
      vi.mocked(mockSpotifyApi.playlists.getPlaylist).mockResolvedValue({
        id: 'playlist-123',
        // biome-ignore lint/suspicious/noExplicitAny: Testing mock
      } as any);

      // When - update favorite for date2
      const dailyListen2 = await getAllListensForUser(userId);
      const spotifyAlbumId = dailyListen2[1].albums[0].album.spotifyId;

      await handler(
        createHandlerEvent(userId, {
          params: { date: '2026-01-15' },
          body: {
            spotifyId: 'track-15-updated',
            name: 'Updated Track',
            trackNumber: 2,
            albumId: spotifyAlbumId,
          },
        }),
      );

      // Then - playlist should be rebuilt with all three tracks in order
      expect(mockSpotifyApi.playlists.updatePlaylistItems).toHaveBeenCalledWith(
        'playlist-123',
        {
          uris: [
            'spotify:track:track-10', // Oldest first
            'spotify:track:track-15-updated', // Updated middle
            'spotify:track:track-20', // Newest last
          ],
        },
      );
    });

    it('should rebuild playlist without removed favorite', async () => {
      // Given - feature enabled with two favorites
      await prisma.user.update({
        where: { id: userId },
        data: { createSongOfDayPlaylist: true },
      });

      const date1 = new Date('2026-01-10');
      const date2 = new Date('2026-01-15');

      for (const date of [date1, date2]) {
        const dailyListen = await createDailyListens({
          userId,
          date,
          albumListen: albumListenInput(),
        });
        const spotifyAlbumId = dailyListen.albums[0].album.spotifyId;

        await handler(
          createHandlerEvent(userId, {
            params: { date: date.toISOString().split('T')[0] },
            body: {
              spotifyId: `track-${date.getDate()}`,
              name: `Track ${date.getDate()}`,
              trackNumber: 1,
              albumId: spotifyAlbumId,
            },
          }),
        );
      }

      vi.clearAllMocks();

      // Mock existing playlist
      vi.mocked(mockSpotifyApi.playlists.getPlaylist).mockResolvedValue({
        id: 'playlist-123',
        // biome-ignore lint/suspicious/noExplicitAny: Testing mock
      } as any);

      // When - clear favorite for date2
      await handler(
        createHandlerEvent(userId, {
          params: { date: '2026-01-15' },
          body: { spotifyId: null },
        }),
      );

      // Then - playlist should only have track from date1
      expect(mockSpotifyApi.playlists.updatePlaylistItems).toHaveBeenCalledWith(
        'playlist-123',
        {
          uris: ['spotify:track:track-10'],
        },
      );
    });

    it('should handle Spotify API errors gracefully', async () => {
      // Given - feature enabled
      await prisma.user.update({
        where: { id: userId },
        data: { createSongOfDayPlaylist: true },
      });

      const date = new Date('2026-01-15');
      const dailyListen = await createDailyListens({
        userId,
        date,
        albumListen: albumListenInput(),
      });
      const spotifyAlbumId = dailyListen.albums[0].album.spotifyId;

      // Mock Spotify API to fail
      vi.mocked(mockSpotifyApi.playlists.createPlaylist).mockRejectedValue(
        new Error('Spotify API error'),
      );

      const favoriteSong = {
        spotifyId: 'track-123',
        name: 'My Favorite Track',
        trackNumber: 5,
        albumId: spotifyAlbumId,
      };

      // When/Then - should not throw, favorite song should still be saved
      const result = await handler(
        createHandlerEvent(userId, {
          params: { date: '2026-01-15' },
          body: favoriteSong,
        }),
      );

      expect(result.favoriteSong).toEqual(favoriteSong);

      // Verify favorite song was saved despite playlist error
      const [savedListen] = await getAllListensForUser(userId);
      expect(savedListen.favoriteSongId).toBe('track-123');
    });
  });
});
