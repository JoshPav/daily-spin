import type { ListenTime } from '@prisma/client';
import type { SimplifiedAlbum, SpotifyApi } from '@spotify/web-api-ts-sdk';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { userCreateInput } from '~~/tests/factories/prisma.factory';
import {
  createAlbumAndTracks,
  createAlbumTracks,
  createFullAlbumPlayHistory,
  playHistory,
  recentlyPlayed,
  simplifiedAlbum,
  toPlayHistory,
} from '~~/tests/factories/spotify.factory';
import {
  clearTestDatabase,
  getTestPrisma,
  setupTestDatabase,
  teardownTestDatabase,
} from '../../tests/setup/db';
import { getSpotifyClientForUser } from '../clients/spotify';

vi.mock('../clients/spotify');

describe('processListens Task Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrisma>;

  const mockGetSpotifyClientForUser = vi.mocked(getSpotifyClientForUser);
  const mockGetRecentlyPlayedTracks = vi.fn();

  const mockSpotifyApi: SpotifyApi = {
    player: {
      getRecentlyPlayedTracks: mockGetRecentlyPlayedTracks,
    },
  } as unknown as SpotifyApi;

  const today = new Date('2026-01-01T12:00:00.000Z');
  const startOfDay = new Date('2026-01-01T00:00:00.000Z');

  beforeAll(async () => {
    vi.setSystemTime(today);

    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    prisma = getTestPrisma();

    mockGetSpotifyClientForUser.mockReturnValue(mockSpotifyApi);
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
    it('should return "No users to process" when no users have feature enabled', async () => {
      // Given - no users with trackListeningHistory enabled
      await prisma.user.create({
        data: userCreateInput({
          trackListeningHistory: false,
        }),
      });

      // When
      const { run } = (await import('./processListens')).default;
      const result = await run();

      // Then
      expect(result).toEqual({ result: 'No users to process' });
    });

    it('should process listens for single user with feature enabled', async () => {
      // Given
      const {
        id: userId,
        accounts: [{ accessToken, accessTokenExpiresAt, refreshToken, scope }],
      } = await prisma.user.create({
        data: userCreateInput({
          trackListeningHistory: true,
        }),
        select: {
          id: true,
          accounts: true,
        },
      });

      const { album, history } = createFullAlbumPlayHistory();

      mockGetRecentlyPlayedTracks.mockResolvedValue(
        recentlyPlayed({ items: history }),
      );

      // When
      const { run } = (await import('./processListens')).default;
      const result = await run();

      // Then
      expect(result).toEqual({ result: 'Finished processing' });

      const [savedListens] = await prisma.dailyListen.findMany({
        where: { userId },
        include: { albums: true },
      });
      expect(savedListens).toMatchObject({
        userId,
        date: startOfDay,
        albums: expect.arrayContaining([getExpectedAlbum(album)]),
      });
    });

    it('should process listens for multiple users with feature enabled', async () => {
      // Given
      const user1Data = await prisma.user.create({
        data: userCreateInput({
          trackListeningHistory: true,
        }),
        select: {
          id: true,
          accounts: true,
        },
      });

      const user2Data = await prisma.user.create({
        data: userCreateInput({
          trackListeningHistory: true,
        }),
        select: {
          id: true,
          accounts: true,
        },
      });

      // User 1 listens to album 1
      const { album: album1, history: history1 } = createFullAlbumPlayHistory();

      // User 2 listens to album 2
      const { album: album2, history: history2 } = createFullAlbumPlayHistory();

      mockGetRecentlyPlayedTracks
        .mockResolvedValueOnce(recentlyPlayed({ items: history1 }))
        .mockResolvedValueOnce(recentlyPlayed({ items: history2 }));

      // When
      const { run } = (await import('./processListens')).default;
      const result = await run();

      // Then
      expect(result).toEqual({ result: 'Finished processing' });

      const user1Listens = await prisma.dailyListen.findFirst({
        where: { userId: user1Data.id },
        include: { albums: true },
      });
      expect(user1Listens).toMatchObject({
        userId: user1Data.id,
        date: startOfDay,
        albums: expect.arrayContaining([getExpectedAlbum(album1)]),
      });

      const user2Listens = await prisma.dailyListen.findFirst({
        where: { userId: user2Data.id },
        include: { albums: true },
      });
      expect(user2Listens).toMatchObject({
        userId: user2Data.id,
        date: startOfDay,
        albums: expect.arrayContaining([getExpectedAlbum(album2)]),
      });
    });

    it('should only process users with feature enabled', async () => {
      // Given
      const userWithFeature = await prisma.user.create({
        data: userCreateInput({
          trackListeningHistory: true,
        }),
        select: {
          id: true,
          accounts: true,
        },
      });

      const userWithoutFeature = await prisma.user.create({
        data: userCreateInput({
          trackListeningHistory: false,
        }),
        select: {
          id: true,
          accounts: true,
        },
      });

      const { album, history } = createFullAlbumPlayHistory();

      mockGetRecentlyPlayedTracks.mockResolvedValue(
        recentlyPlayed({ items: history }),
      );

      // When
      const { run } = (await import('./processListens')).default;
      const result = await run();

      // Then
      expect(result).toEqual({ result: 'Finished processing' });

      // User with feature should have listens
      const userWithFeatureListens = await prisma.dailyListen.findFirst({
        where: { userId: userWithFeature.id },
        include: { albums: true },
      });
      expect(userWithFeatureListens).toMatchObject({
        userId: userWithFeature.id,
        date: startOfDay,
        albums: expect.arrayContaining([getExpectedAlbum(album)]),
      });

      // User without feature should not have listens
      const userWithoutFeatureListens = await prisma.dailyListen.findFirst({
        where: { userId: userWithoutFeature.id },
      });
      expect(userWithoutFeatureListens).toBeNull();
    });

    describe('ordering', () => {
      it('should save in order album listen to database', async () => {
        // Given
        await prisma.user.create({
          data: userCreateInput({
            trackListeningHistory: true,
          }),
          select: {
            id: true,
            accounts: true,
          },
        });

        const { album, history } = createFullAlbumPlayHistory();

        mockGetRecentlyPlayedTracks.mockResolvedValue(
          recentlyPlayed({ items: history }),
        );

        // When
        const { run } = (await import('./processListens')).default;
        await run();

        // Then
        const [savedListens] = await prisma.dailyListen.findMany({
          include: { albums: true },
        });
        expect(savedListens).toMatchObject({
          date: startOfDay,
          albums: expect.arrayContaining([getExpectedAlbum(album)]),
        });
      });

      it('should still record album when a song from another album is listened to in the middle', async () => {
        // Given
        await prisma.user.create({
          data: userCreateInput({
            trackListeningHistory: true,
          }),
          select: {
            id: true,
            accounts: true,
          },
        });

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
        const { run } = (await import('./processListens')).default;
        await run();

        // Then
        const [savedListens] = await prisma.dailyListen.findMany({
          include: { albums: true },
        });
        expect(savedListens).toMatchObject({
          date: startOfDay,
          albums: expect.arrayContaining([
            getExpectedAlbum(album, { listenOrder: 'interrupted' }),
          ]),
        });
      });

      it('should save shuffled album listen to database', async () => {
        // Given
        await prisma.user.create({
          data: userCreateInput({
            trackListeningHistory: true,
          }),
        });

        const { album, history } = createFullAlbumPlayHistory();

        history[0].track.track_number = 2;
        history[1].track.track_number = 1;

        mockGetRecentlyPlayedTracks.mockResolvedValue(
          recentlyPlayed({ items: history }),
        );

        // When
        const { run } = (await import('./processListens')).default;
        await run();

        // Then
        const [savedListens] = await prisma.dailyListen.findMany({
          include: { albums: true },
        });
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
      ])(
        'should save album listened to at $listenTime',
        async ({ hour, listenTime }) => {
          // Given
          await prisma.user.create({
            data: userCreateInput({
              trackListeningHistory: true,
            }),
          });

          const { album, history } = createFullAlbumPlayHistory({ hour });

          mockGetRecentlyPlayedTracks.mockResolvedValue(
            recentlyPlayed({ items: history }),
          );

          // When
          const { run } = (await import('./processListens')).default;
          await run();

          // Then
          const [savedListens] = await prisma.dailyListen.findMany({
            include: { albums: true },
          });
          expect(savedListens).toMatchObject({
            date: startOfDay,
            albums: expect.arrayContaining([
              getExpectedAlbum(album, { listenTime }),
            ]),
          });
        },
      );
    });

    it('should not save history from previous days', async () => {
      // Given
      await prisma.user.create({
        data: userCreateInput({
          trackListeningHistory: true,
        }),
      });

      const { history } = createFullAlbumPlayHistory({
        tracksInAlbum: 4,
        date: `2025-12-31`,
      });

      mockGetRecentlyPlayedTracks.mockResolvedValue(
        recentlyPlayed({ items: history }),
      );

      // When
      const { run } = (await import('./processListens')).default;
      await run();

      // Then
      const [savedListens] = await prisma.dailyListen.findMany({
        include: { albums: true },
      });
      expect(savedListens).toBeUndefined();
    });

    it('should not save album with less than 5 tracks', async () => {
      // Given
      await prisma.user.create({
        data: userCreateInput({
          trackListeningHistory: true,
        }),
      });

      const { history } = createFullAlbumPlayHistory({
        tracksInAlbum: 4,
      });

      mockGetRecentlyPlayedTracks.mockResolvedValue(
        recentlyPlayed({ items: history }),
      );

      // When
      const { run } = (await import('./processListens')).default;
      await run();

      // Then
      const [savedListens] = await prisma.dailyListen.findMany({
        include: { albums: true },
      });
      expect(savedListens).toBeUndefined();
    });

    it('should save multiple albums for same day', async () => {
      // Given
      await prisma.user.create({
        data: userCreateInput({
          trackListeningHistory: true,
        }),
      });

      const { album: album1, history: history1 } = createFullAlbumPlayHistory({
        hour: '08',
      });
      const { album: album2, history: history2 } = createFullAlbumPlayHistory({
        hour: '14',
      });

      mockGetRecentlyPlayedTracks.mockResolvedValue(
        recentlyPlayed({ items: [...history1, ...history2] }),
      );

      // When
      const { run } = (await import('./processListens')).default;
      await run();

      // Then
      const [savedListens] = await prisma.dailyListen.findMany({
        include: { albums: true },
      });
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
      let userId: string;

      beforeEach(async () => {
        const user = await prisma.user.create({
          data: userCreateInput({
            trackListeningHistory: true,
          }),
          select: {
            id: true,
          },
        });
        userId = user.id;

        existingAlbum = simplifiedAlbum();

        await prisma.dailyListen.create({
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
        const { run } = (await import('./processListens')).default;
        await run();

        // Then
        const [savedListens] = await prisma.dailyListen.findMany({
          where: { userId },
          include: { albums: true },
        });
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
        const { run } = (await import('./processListens')).default;
        await run();

        // Then
        const [savedListens] = await prisma.dailyListen.findMany({
          where: { userId },
          include: { albums: true },
        });
        expect(savedListens).toMatchObject({
          userId,
          date: startOfDay,
          albums: expect.arrayContaining([
            getExpectedAlbum(existingAlbum, { listenTime: 'morning' }),
          ]),
        });
      });
    });
  });
});
