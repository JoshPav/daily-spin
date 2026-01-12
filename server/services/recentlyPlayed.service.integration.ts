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
import { userCreateInput } from '~/tests/factories/prisma.factory';
import {
  createAlbumAndTracks,
  createAlbumTracks,
  createFullAlbumPlayHistory,
  playHistory,
  recentlyPlayed,
  simplifiedAlbum,
  toPlayHistory,
} from '~/tests/factories/spotify.factory';
import {
  clearTestDatabase,
  getTestPrisma,
  setupTestDatabase,
  teardownTestDatabase,
} from '../../tests/setup/db';
import { getSpotifyClientForUser } from '../clients/spotify';
import { DailyListenRepository } from '../repositories/dailyListen.repository';
import { RecentlyPlayedService } from './recentlyPlayed.service';
import type { UserWithAuthTokens } from './user.service';

vi.mock('../clients/spotify');

describe('RecentlyPlayedService Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrisma>;
  let service: RecentlyPlayedService;
  let repository: DailyListenRepository;

  let user: UserWithAuthTokens;

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

    // Create a test user
    const {
      id: userId,
      accounts: [{ accessToken, accessTokenExpiresAt, refreshToken, scope }],
    } = await prisma.user.create({
      data: userCreateInput(),
      select: {
        id: true,
        sessions: true,
        accounts: true,
      },
    });

    user = {
      id: userId,
      auth: { accessToken, accessTokenExpiresAt, refreshToken, scope },
    };

    mockGetSpotifyClientForUser.mockReturnValue(mockSpotifyApi);

    // Create repository with test Prisma client
    repository = new DailyListenRepository(prisma);
    service = new RecentlyPlayedService(repository);
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
    describe('ordering', () => {
      it('should save in order album listen to database', async () => {
        // Given
        const { album, history } = createFullAlbumPlayHistory();

        mockGetRecentlyPlayedTracks.mockResolvedValue(
          recentlyPlayed({ items: history }),
        );

        // When
        await service.processTodaysListens(user);

        // Then
        const [savedListens] = await prisma.dailyListen.findMany({
          where: { userId: user.id },
          include: { albums: true },
        });
        expect(savedListens).toMatchObject({
          userId: user.id,
          date: startOfDay,
          albums: expect.arrayContaining([getExpectedAlbum(album)]),
        });
      });

      it('should still record album when a song from a another album is listened to in the middle', async () => {
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
        await service.processTodaysListens(user);

        // Then
        expect(mockGetRecentlyPlayedTracks).toHaveBeenCalled();
        expect(mockGetSpotifyClientForUser).toHaveBeenCalledWith(user.auth);

        const [savedListens] = await prisma.dailyListen.findMany({
          where: { userId: user.id },
          include: { albums: true },
        });
        expect(savedListens).toMatchObject({
          userId: user.id,
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
        await service.processTodaysListens(user);

        // Then
        expect(mockGetRecentlyPlayedTracks).toHaveBeenCalled();
        expect(mockGetSpotifyClientForUser).toHaveBeenCalledWith(user.auth);

        const [savedListens] = await prisma.dailyListen.findMany({
          where: { userId: user.id },
          include: { albums: true },
        });
        expect(savedListens).toMatchObject({
          userId: user.id,
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
        await service.processTodaysListens(user);

        // Then
        expect(mockGetRecentlyPlayedTracks).toHaveBeenCalled();
        expect(mockGetSpotifyClientForUser).toHaveBeenCalledWith(user.auth);

        const [savedListens] = await prisma.dailyListen.findMany({
          where: { userId: user.id },
          include: { albums: true },
        });
        expect(savedListens).toMatchObject({
          userId: user.id,
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
      await service.processTodaysListens(user);

      // Then
      expect(mockGetRecentlyPlayedTracks).toHaveBeenCalled();
      expect(mockGetSpotifyClientForUser).toHaveBeenCalledWith(user.auth);

      const [savedListens] = await prisma.dailyListen.findMany({
        where: { userId: user.id },
        include: { albums: true },
      });
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
      await service.processTodaysListens(user);

      // Then
      expect(mockGetRecentlyPlayedTracks).toHaveBeenCalled();
      expect(mockGetSpotifyClientForUser).toHaveBeenCalledWith(user.auth);

      const [savedListens] = await prisma.dailyListen.findMany({
        where: { userId: user.id },
        include: { albums: true },
      });
      expect(savedListens).toBeUndefined();
    });

    it('should save multiple albums for same day', async () => {
      // Given
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
      await service.processTodaysListens(user);

      // Then
      expect(mockGetRecentlyPlayedTracks).toHaveBeenCalled();
      expect(mockGetSpotifyClientForUser).toHaveBeenCalledWith(user.auth);

      const [savedListens] = await prisma.dailyListen.findMany({
        where: { userId: user.id },
        include: { albums: true },
      });
      expect(savedListens).toMatchObject({
        userId: user.id,
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

        await prisma.dailyListen.create({
          data: {
            userId: user.id,
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

      it(`should appended additional albums to today's record`, async () => {
        // Given
        const { album, history } = createFullAlbumPlayHistory();

        mockGetRecentlyPlayedTracks.mockResolvedValue(
          recentlyPlayed({ items: history }),
        );

        // When
        await service.processTodaysListens(user);

        // Then
        const [savedListens] = await prisma.dailyListen.findMany({
          where: { userId: user.id },
          include: { albums: true },
        });
        expect(savedListens).toMatchObject({
          userId: user.id,
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
        await service.processTodaysListens(user);

        // Then
        const [savedListens] = await prisma.dailyListen.findMany({
          where: { userId: user.id },
          include: { albums: true },
        });
        expect(savedListens).toMatchObject({
          userId: user.id,
          date: startOfDay,
          albums: expect.arrayContaining([
            getExpectedAlbum(existingAlbum, { listenTime: 'morning' }),
          ]),
        });
      });
    });
  });
});
