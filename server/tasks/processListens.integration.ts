import type { Account, ListenTime } from '@prisma/client';
import type { SimplifiedAlbum } from '@spotify/web-api-ts-sdk';
import type { Task } from 'nitropack/types';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { getTestPrisma } from '~~/tests/db/setup';
import {
  createBacklogItem,
  createUser,
  getAllListensForUser,
  getBacklogItemsForUser,
} from '~~/tests/db/utils';
import {
  createAlbumAndTracks,
  createAlbumTracks,
  createFullAlbumPlayHistory,
  playHistory,
  recentlyPlayed,
  simplifiedAlbum,
  toPlayHistory,
} from '~~/tests/factories/spotify.factory';
import { mockRuntimeConfig } from '~~/tests/integration.setup';
import {
  mockSpotifyApi,
  mockWithAccessToken,
} from '~~/tests/mocks/spotifyMock';

vi.stubGlobal('defineTask', (task: Task<string>) => task);

describe('processListens Task Integration Tests', () => {
  const mockGetRecentlyPlayedTracks = vi.mocked(
    mockSpotifyApi.player.getRecentlyPlayedTracks,
  );

  const today = new Date('2026-01-01T12:00:00.000Z');
  const startOfDay = new Date('2026-01-01T00:00:00.000Z');

  const spotifyClientId = 'test-spotify-client-id';
  const spotifyClientSecret = 'test-spotify-client-secret';

  let processEvent: () => ReturnType<Task['run']>;

  beforeAll(async () => {
    vi.setSystemTime(today);
    mockRuntimeConfig.spotifyClientId = spotifyClientId;
    mockRuntimeConfig.spotifyClientSecret = spotifyClientSecret;

    const eventHandler = (await import('./processListens')).default.run;
    processEvent = () =>
      eventHandler({ name: 'event', context: {}, payload: {} });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const getExpectedAlbum = (
    album: SimplifiedAlbum,
    { listenOrder = 'ordered', listenTime = 'noon' } = {},
  ) =>
    expect.objectContaining({
      albumId: album.id,
      listenOrder,
      imageUrl: album.images[1].url,
      albumName: album.name,
      artistNames: album.artists[0].name,
      listenTime,
    });

  describe('processTodaysListens', () => {
    it('should return no users when no users have feature enabled', async () => {
      // Given
      await createUser({ trackListeningHistory: false });

      // When
      const { result } = await processEvent();

      // Then
      expect(result).toEqual('No users to process');
      expect(mockGetRecentlyPlayedTracks).not.toHaveBeenCalled();
    });

    describe('when a user with history tracking exists', () => {
      let userId: string;
      let userAccount: Account;

      beforeEach(async () => {
        const user = await createUser({
          trackListeningHistory: true,
        });
        userId = user.id;
        userAccount = user.accounts[0];
      });

      describe('when additional users exist', () => {
        it('should process listens for multiple users with feature enabled', async () => {
          // Given
          const otherUser = await createUser({
            trackListeningHistory: true,
          });

          // User 1 listens to album 1
          const { history: history1 } = createFullAlbumPlayHistory();

          // User 2 listens to album 2
          const { history: history2 } = createFullAlbumPlayHistory();

          mockGetRecentlyPlayedTracks
            .mockResolvedValueOnce(recentlyPlayed({ items: history1 }))
            .mockResolvedValueOnce(recentlyPlayed({ items: history2 }));

          // When
          const { result } = await processEvent();

          // Then
          expect(result).toEqual('Successfully processed 2 user(s)');
          const [user1Listens] = await getAllListensForUser(userId);
          expect(user1Listens).toMatchObject({
            date: startOfDay,
            albums: expect.arrayContaining([
              getExpectedAlbum(history1[0].track.album),
            ]),
          });

          const [user2Listens] = await getAllListensForUser(otherUser.id);
          expect(user2Listens).toMatchObject({
            date: startOfDay,
            albums: expect.arrayContaining([
              getExpectedAlbum(history2[0].track.album),
            ]),
          });
        });

        it('should only process users with feature enabled', async () => {
          // Given
          const user2 = await createUser({
            trackListeningHistory: false,
          });
          const { album, history } = createFullAlbumPlayHistory();

          mockGetRecentlyPlayedTracks.mockResolvedValue(
            recentlyPlayed({ items: history }),
          );

          // When
          const { result } = await processEvent();

          // Then
          expect(result).toEqual('Successfully processed 1 user(s)');
          const [userWithFeatureListens] = await getAllListensForUser(userId);
          expect(userWithFeatureListens).toMatchObject({
            userId,
            date: startOfDay,
            albums: expect.arrayContaining([getExpectedAlbum(album)]),
          });

          // User without feature should not have listens
          const allListens = await getAllListensForUser(user2.id);
          expect(allListens).toHaveLength(0);
        });
      });

      it('should process listens for single user with feature enabled', async () => {
        // Given
        const { album, history } = createFullAlbumPlayHistory();

        mockGetRecentlyPlayedTracks.mockResolvedValue(
          recentlyPlayed({ items: history }),
        );

        // When
        const { result } = await processEvent();

        // Then
        expect(mockWithAccessToken).toHaveBeenCalledWith(spotifyClientId, {
          access_token: userAccount.accessToken,
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: userAccount.refreshToken,
        });
        expect(result).toEqual('Successfully processed 1 user(s)');
        const [savedListens] = await getAllListensForUser(userId);
        expect(savedListens).toMatchObject({
          userId,
          date: startOfDay,
          albums: expect.arrayContaining([getExpectedAlbum(album)]),
        });
      });

      describe('ordering', () => {
        it('should save in order album listen to database', async () => {
          // Given

          const { album, history } = createFullAlbumPlayHistory();

          mockGetRecentlyPlayedTracks.mockResolvedValue(
            recentlyPlayed({ items: history }),
          );

          // When
          const { result } = await processEvent();

          // Then
          expect(result).toEqual('Successfully processed 1 user(s)');
          const [savedListens] = await getAllListensForUser(userId);
          expect(savedListens).toMatchObject({
            date: startOfDay,
            albums: expect.arrayContaining([getExpectedAlbum(album)]),
          });
        });

        it('should still record album when a song from another album is listened to in the middle', async () => {
          // Given

          const { album, history } = createFullAlbumPlayHistory();

          const {
            tracks: [album2Track],
          } = createAlbumAndTracks();

          history.splice(
            5,
            0,
            playHistory({
              track: album2Track,
              played_at: '2026-01-01T12:15:00.000Z',
            }),
          );

          mockGetRecentlyPlayedTracks.mockResolvedValue(
            recentlyPlayed({
              items: history,
            }),
          );

          // When
          const { result } = await processEvent();

          // Then
          expect(result).toEqual('Successfully processed 1 user(s)');
          const [savedListens] = await getAllListensForUser(userId);
          expect(savedListens).toMatchObject({
            date: startOfDay,
            albums: expect.arrayContaining([
              getExpectedAlbum(album, { listenOrder: 'interrupted' }),
            ]),
          });
        });

        it('should save shuffled album listen to database', async () => {
          // Given

          const { album, history } = createFullAlbumPlayHistory();

          history[0].track.track_number = 2;
          history[1].track.track_number = 1;

          mockGetRecentlyPlayedTracks.mockResolvedValue(
            recentlyPlayed({ items: history }),
          );

          // When
          const { result } = await processEvent();

          // Then
          expect(result).toEqual('Successfully processed 1 user(s)');
          const [savedListens] = await getAllListensForUser(userId);
          expect(savedListens).toMatchObject({
            date: startOfDay,
            albums: expect.arrayContaining([
              getExpectedAlbum(album, { listenOrder: 'shuffled' }),
            ]),
          });
        });
      });

      describe('listen time', () => {
        it.each<{ hour: string; listenTime: ListenTime }>([
          { hour: '08', listenTime: 'morning' },
          { hour: '15', listenTime: 'noon' },
          { hour: '19', listenTime: 'evening' },
          { hour: '23', listenTime: 'night' },
        ])('should save album listened to at $listenTime', async ({
          hour,
          listenTime,
        }) => {
          // Given

          const { album, history } = createFullAlbumPlayHistory({ hour });

          mockGetRecentlyPlayedTracks.mockResolvedValue(
            recentlyPlayed({ items: history }),
          );

          // When
          const { result } = await processEvent();

          // Then
          expect(result).toEqual('Successfully processed 1 user(s)');
          const [savedListens] = await getAllListensForUser(userId);
          expect(savedListens).toMatchObject({
            date: startOfDay,
            albums: expect.arrayContaining([
              getExpectedAlbum(album, { listenTime }),
            ]),
          });
        });
      });

      it('should not save history from previous days', async () => {
        // Given

        const { history } = createFullAlbumPlayHistory({
          tracksInAlbum: 4,
          date: `2025-12-31`,
        });

        mockGetRecentlyPlayedTracks.mockResolvedValue(
          recentlyPlayed({ items: history }),
        );

        // When
        const { result } = await processEvent();

        // Then
        expect(result).toEqual('Successfully processed 1 user(s)');
        const [savedListens] = await getAllListensForUser(userId);
        expect(savedListens).toBeUndefined();
      });

      it('should not save album with less than 5 tracks', async () => {
        // Given

        const { history } = createFullAlbumPlayHistory({
          tracksInAlbum: 4,
        });

        mockGetRecentlyPlayedTracks.mockResolvedValue(
          recentlyPlayed({ items: history }),
        );

        // When
        const { result } = await processEvent();

        // Then
        expect(result).toEqual('Successfully processed 1 user(s)');
        const [savedListens] = await getAllListensForUser(userId);
        expect(savedListens).toBeUndefined();
      });

      it('should save multiple albums for same day', async () => {
        // Given
        const { album: album1, history: history1 } = createFullAlbumPlayHistory(
          {
            hour: '08',
          },
        );
        const { album: album2, history: history2 } = createFullAlbumPlayHistory(
          {
            hour: '14',
          },
        );

        mockGetRecentlyPlayedTracks.mockResolvedValue(
          recentlyPlayed({ items: [...history1, ...history2] }),
        );

        // When
        const { result } = await processEvent();

        // Then
        expect(result).toEqual('Successfully processed 1 user(s)');
        const [savedListens] = await getAllListensForUser(userId);
        expect(savedListens).toMatchObject({
          date: startOfDay,
          albums: expect.arrayContaining([
            getExpectedAlbum(album1, { listenTime: 'morning' }),
            getExpectedAlbum(album2, { listenTime: 'noon' }),
          ]),
        });
      });

      describe('existing db record', () => {
        let existingAlbum: SimplifiedAlbum;

        beforeEach(async () => {
          existingAlbum = simplifiedAlbum();

          await getTestPrisma().dailyListenOld.create({
            data: {
              userId,
              date: startOfDay,
              albums: {
                create: [
                  {
                    albumId: existingAlbum.id,
                    albumName: existingAlbum.name,
                    artistNames: existingAlbum.artists[0].name,
                    imageUrl: existingAlbum.images[1].url,
                    listenMethod: 'spotify',
                    listenOrder: 'ordered',
                    listenTime: 'morning',
                  },
                ],
              },
            },
          });
        });

        it(`should append additional albums to today's record`, async () => {
          // Given
          const { album, history } = createFullAlbumPlayHistory();

          mockGetRecentlyPlayedTracks.mockResolvedValue(
            recentlyPlayed({ items: history }),
          );

          // When
          const { result } = await processEvent();

          // Then
          expect(result).toEqual('Successfully processed 1 user(s)');
          const [savedListens] = await getAllListensForUser(userId);
          expect(savedListens).toMatchObject({
            userId,
            date: startOfDay,
            albums: expect.arrayContaining([
              getExpectedAlbum(existingAlbum, { listenTime: 'morning' }),
              getExpectedAlbum(album),
            ]),
          });
        });

        it(`should not override first listen of album`, async () => {
          // Given
          const tracks = createAlbumTracks({ album: existingAlbum });
          const history = toPlayHistory({ tracks });

          mockGetRecentlyPlayedTracks.mockResolvedValue(
            recentlyPlayed({ items: history }),
          );

          // When
          const { result } = await processEvent();

          // Then
          expect(result).toEqual('Successfully processed 1 user(s)');
          const [savedListens] = await getAllListensForUser(userId);
          expect(savedListens).toMatchObject({
            userId,
            date: startOfDay,
            albums: expect.arrayContaining([
              getExpectedAlbum(existingAlbum, { listenTime: 'morning' }),
            ]),
          });
        });
      });

      describe('backlog cleanup', () => {
        it('should remove listened album from backlog', async () => {
          // Given
          const { album, history } = createFullAlbumPlayHistory();

          // Add album to user's backlog
          await createBacklogItem({
            userId,
            item: {
              spotifyId: album.id,
              name: album.name,
              artists: [
                { spotifyId: album.artists[0].id, name: album.artists[0].name },
              ],
            },
          });

          // Verify backlog item exists
          const backlogBefore = await getBacklogItemsForUser(userId);
          expect(backlogBefore).toHaveLength(1);

          mockGetRecentlyPlayedTracks.mockResolvedValue(
            recentlyPlayed({ items: history }),
          );

          // When
          await processEvent();

          // Then
          const backlogAfter = await getBacklogItemsForUser(userId);
          expect(backlogAfter).toHaveLength(0);
        });

        it('should remove multiple listened albums from backlog', async () => {
          // Given
          const { album: album1, history: history1 } =
            createFullAlbumPlayHistory({ hour: '08' });
          const { album: album2, history: history2 } =
            createFullAlbumPlayHistory({ hour: '14' });

          // Add both albums to backlog
          await createBacklogItem({
            userId,
            item: {
              spotifyId: album1.id,
              name: album1.name,
              artists: [
                {
                  spotifyId: album1.artists[0].id,
                  name: album1.artists[0].name,
                },
              ],
            },
          });
          await createBacklogItem({
            userId,
            item: {
              spotifyId: album2.id,
              name: album2.name,
              artists: [
                {
                  spotifyId: album2.artists[0].id,
                  name: album2.artists[0].name,
                },
              ],
            },
          });

          // Verify backlog items exist
          const backlogBefore = await getBacklogItemsForUser(userId);
          expect(backlogBefore).toHaveLength(2);

          mockGetRecentlyPlayedTracks.mockResolvedValue(
            recentlyPlayed({ items: [...history1, ...history2] }),
          );

          // When
          await processEvent();

          // Then
          const backlogAfter = await getBacklogItemsForUser(userId);
          expect(backlogAfter).toHaveLength(0);
        });

        it('should not affect other albums in backlog', async () => {
          // Given
          const { album: listenedAlbum, history } =
            createFullAlbumPlayHistory();

          // Add listened album and another album to backlog
          await createBacklogItem({
            userId,
            item: {
              spotifyId: listenedAlbum.id,
              name: listenedAlbum.name,
              artists: [
                {
                  spotifyId: listenedAlbum.artists[0].id,
                  name: listenedAlbum.artists[0].name,
                },
              ],
            },
          });
          await createBacklogItem({
            userId,
            item: {
              spotifyId: 'other-album-id',
              name: 'Other Album',
              artists: [{ spotifyId: 'other-artist-id', name: 'Other Artist' }],
            },
          });

          const backlogBefore = await getBacklogItemsForUser(userId);
          expect(backlogBefore).toHaveLength(2);

          mockGetRecentlyPlayedTracks.mockResolvedValue(
            recentlyPlayed({ items: history }),
          );

          // When
          await processEvent();

          // Then
          const backlogAfter = await getBacklogItemsForUser(userId);
          expect(backlogAfter).toHaveLength(1);
          expect(backlogAfter[0].album.spotifyId).toBe('other-album-id');
        });

        it('should only remove backlog item for the user who listened', async () => {
          // Given
          const otherUser = await createUser({ trackListeningHistory: false });
          const { album, history } = createFullAlbumPlayHistory();

          // Both users have the same album in backlog
          await createBacklogItem({
            userId,
            item: {
              spotifyId: album.id,
              name: album.name,
              artists: [
                { spotifyId: album.artists[0].id, name: album.artists[0].name },
              ],
            },
          });
          await createBacklogItem({
            userId: otherUser.id,
            item: {
              spotifyId: album.id,
              name: album.name,
              artists: [
                { spotifyId: album.artists[0].id, name: album.artists[0].name },
              ],
            },
          });

          mockGetRecentlyPlayedTracks.mockResolvedValue(
            recentlyPlayed({ items: history }),
          );

          // When
          await processEvent();

          // Then - only current user's backlog is cleaned
          const currentUserBacklog = await getBacklogItemsForUser(userId);
          expect(currentUserBacklog).toHaveLength(0);

          const otherUserBacklog = await getBacklogItemsForUser(otherUser.id);
          expect(otherUserBacklog).toHaveLength(1);
        });
      });

      describe('token refresh', () => {
        let mockFetch: ReturnType<typeof vi.fn>;

        beforeEach(() => {
          mockFetch = vi.fn();
          vi.stubGlobal('fetch', mockFetch);
        });

        afterEach(() => {
          vi.unstubAllGlobals();
        });

        it('should refresh expired access token before fetching recently played', async () => {
          // Given - user with expired token
          const expiredUser = await createUser({
            trackListeningHistory: true,
            accounts: {
              create: {
                accessTokenExpiresAt: new Date('2025-12-31T00:00:00.000Z'), // Expired
              },
            },
          });

          const { album, history } = createFullAlbumPlayHistory();

          // Mock token refresh response
          const newAccessToken = 'new-access-token';
          const newExpiresIn = 3600;
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              access_token: newAccessToken,
              token_type: 'Bearer',
              expires_in: newExpiresIn,
              scope: 'user-read-recently-played',
            }),
            text: async () => '',
          });

          mockGetRecentlyPlayedTracks.mockResolvedValue(
            recentlyPlayed({ items: history }),
          );

          // When
          const { result } = await processEvent();

          // Then - token refresh endpoint was called
          expect(mockFetch).toHaveBeenCalledWith(
            'https://accounts.spotify.com/api/token',
            expect.objectContaining({
              method: 'POST',
              headers: expect.objectContaining({
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: expect.stringContaining('Basic'),
              }),
              body: expect.any(URLSearchParams),
            }),
          );

          // Verify the body contains correct params
          const fetchCall = mockFetch.mock.calls[0];
          const body = fetchCall[1].body as URLSearchParams;
          expect(body.get('grant_type')).toBe('refresh_token');
          expect(body.get('refresh_token')).toBe(
            expiredUser.accounts[0].refreshToken,
          );

          // Then - Spotify API was called with new token
          expect(mockWithAccessToken).toHaveBeenCalledWith(spotifyClientId, {
            access_token: newAccessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: expiredUser.accounts[0].refreshToken,
          });

          // Then - database was updated with new token
          const prisma = getTestPrisma();
          const updatedAccount = await prisma.account.findFirst({
            where: {
              userId: expiredUser.id,
              providerId: 'spotify',
            },
          });
          expect(updatedAccount?.accessToken).toBe(newAccessToken);
          expect(updatedAccount?.accessTokenExpiresAt).toEqual(
            new Date(today.getTime() + newExpiresIn * 1000),
          );

          // Then - listens were processed successfully
          expect(result).toEqual('Successfully processed 1 user(s)');
          const [savedListens] = await getAllListensForUser(expiredUser.id);
          expect(savedListens).toMatchObject({
            date: startOfDay,
            albums: expect.arrayContaining([getExpectedAlbum(album)]),
          });
        });

        it('should not refresh token if not expired', async () => {
          // Given - user with valid token (expires in future)
          const validUser = await createUser({
            trackListeningHistory: true,
            accounts: {
              create: {
                accessTokenExpiresAt: new Date('2026-12-31T00:00:00.000Z'), // Future date
              },
            },
          });

          const { history } = createFullAlbumPlayHistory();

          mockGetRecentlyPlayedTracks.mockResolvedValue(
            recentlyPlayed({ items: history }),
          );

          // When
          await processEvent();

          // Then - token refresh was NOT called
          expect(mockFetch).not.toHaveBeenCalled();

          // Then - Spotify API was called with existing token
          expect(mockWithAccessToken).toHaveBeenCalledWith(spotifyClientId, {
            access_token: validUser.accounts[0].accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: validUser.accounts[0].refreshToken,
          });
        });

        it('should refresh token if expires within 5 minutes', async () => {
          // Given - user with token expiring soon
          const soonToExpireUser = await createUser({
            trackListeningHistory: true,
            accounts: {
              create: {
                accessTokenExpiresAt: new Date(today.getTime() + 4 * 60 * 1000), // Expires in 4 minutes
              },
            },
          });

          const { history } = createFullAlbumPlayHistory();

          const newAccessToken = 'refreshed-token';
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              access_token: newAccessToken,
              token_type: 'Bearer',
              expires_in: 3600,
              scope: 'user-read-recently-played',
            }),
            text: async () => '',
          });

          mockGetRecentlyPlayedTracks.mockResolvedValue(
            recentlyPlayed({ items: history }),
          );

          // When
          await processEvent();

          // Then - token was refreshed due to 5 minute buffer
          expect(mockFetch).toHaveBeenCalledWith(
            'https://accounts.spotify.com/api/token',
            expect.any(Object),
          );

          expect(mockWithAccessToken).toHaveBeenCalledWith(spotifyClientId, {
            access_token: newAccessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: soonToExpireUser.accounts[0].refreshToken,
          });
        });

        it('should handle token refresh failure gracefully', async () => {
          // Given - user with expired token
          const expiredUser = await createUser({
            trackListeningHistory: true,
            accounts: {
              create: {
                accessTokenExpiresAt: new Date('2025-12-31T00:00:00.000Z'),
              },
            },
          });

          // Mock token refresh failure
          mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            text: async () => 'Invalid refresh token',
          });

          // When
          const { result } = await processEvent();

          // Then - error is handled, user processing continues
          expect(result).toEqual('Successfully processed 1 user(s)');

          // Then - no listens were saved due to token refresh failure
          const savedListens = await getAllListensForUser(expiredUser.id);
          expect(savedListens).toHaveLength(0);
        });
      });
    });
  });
});
