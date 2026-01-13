import type { SpotifyApi } from '@spotify/web-api-ts-sdk';
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
  clearTestDatabase,
  getTestPrisma,
  setupTestDatabase,
  teardownTestDatabase,
} from '../../tests/setup/db';
import { DailyListenService } from '../services/dailyListen.service';
import { album, listenMetadata } from '../../tests/factories/api.factory';
import {
  createFullAlbumPlayHistory,
  recentlyPlayed,
} from '../../tests/factories/spotify.factory';
import { getSpotifyClientForUser } from '../clients/spotify';

vi.mock('../clients/spotify');

describe('GET /api/listens Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrisma>;
  let service: DailyListenService;
  let userId: string;

  const mockGetSpotifyClientForUser = vi.mocked(getSpotifyClientForUser);
  const mockGetRecentlyPlayedTracks = vi.fn();

  const mockSpotifyApi: SpotifyApi = {
    player: {
      getRecentlyPlayedTracks: mockGetRecentlyPlayedTracks,
    },
  } as unknown as SpotifyApi;

  const today = new Date('2026-01-15T12:00:00.000Z');
  const startOfToday = new Date('2026-01-15T00:00:00.000Z');

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
    const user = await prisma.user.create({
      data: userCreateInput(),
      select: { id: true },
    });
    userId = user.id;

    mockGetSpotifyClientForUser.mockReturnValue(mockSpotifyApi);

    service = new DailyListenService(
      new (await import('../repositories/dailyListen.repository'))
        .DailyListenRepository(prisma),
      new (await import('../repositories/user.repository')).UserRepository(
        prisma,
      ),
    );
  });

  describe('getListensInRange', () => {
    it('should return listens for a date range', async () => {
      // Given
      const day1 = new Date('2026-01-10T00:00:00.000Z');
      const day2 = new Date('2026-01-12T00:00:00.000Z');

      const album1 = album({ albumId: 'album-1', albumName: 'Album 1' });
      const album2 = album({ albumId: 'album-2', albumName: 'Album 2' });

      await prisma.dailyListen.create({
        data: {
          userId,
          date: day1,
          albums: {
            create: {
              albumId: album1.albumId,
              albumName: album1.albumName,
              artistNames: album1.artistNames,
              imageUrl: album1.imageUrl,
              listenMethod: 'spotify',
              listenOrder: 'ordered',
              listenTime: 'morning',
            },
          },
        },
      });

      await prisma.dailyListen.create({
        data: {
          userId,
          date: day2,
          albums: {
            create: {
              albumId: album2.albumId,
              albumName: album2.albumName,
              artistNames: album2.artistNames,
              imageUrl: album2.imageUrl,
              listenMethod: 'vinyl',
              listenOrder: 'shuffled',
              listenTime: 'evening',
            },
          },
        },
      });

      // When
      const result = await service.getListensInRange(userId, {
        start: day1,
        end: day2,
      });

      // Then
      expect(result).toHaveLength(3); // day1, day2, and the missing day in between
      expect(result[0]).toMatchObject({
        date: day1.toISOString(),
        albums: expect.arrayContaining([
          expect.objectContaining({
            album: expect.objectContaining({
              albumId: 'album-1',
              albumName: 'Album 1',
            }),
            listenMetadata: expect.objectContaining({
              listenMethod: 'spotify',
              listenOrder: 'ordered',
              listenTime: 'morning',
            }),
          }),
        ]),
      });

      expect(result[2]).toMatchObject({
        date: day2.toISOString(),
        albums: expect.arrayContaining([
          expect.objectContaining({
            album: expect.objectContaining({
              albumId: 'album-2',
              albumName: 'Album 2',
            }),
            listenMetadata: expect.objectContaining({
              listenMethod: 'vinyl',
              listenOrder: 'shuffled',
              listenTime: 'evening',
            }),
          }),
        ]),
      });
    });

    it('should fill in missing days with empty albums array', async () => {
      // Given
      const day1 = new Date('2026-01-10T00:00:00.000Z');
      const day3 = new Date('2026-01-12T00:00:00.000Z');
      const missingDay = new Date('2026-01-11T00:00:00.000Z');

      const testAlbum = album();

      await prisma.dailyListen.create({
        data: {
          userId,
          date: day1,
          albums: {
            create: {
              albumId: testAlbum.albumId,
              albumName: testAlbum.albumName,
              artistNames: testAlbum.artistNames,
              imageUrl: testAlbum.imageUrl,
              listenMethod: 'spotify',
              listenOrder: 'ordered',
              listenTime: 'noon',
            },
          },
        },
      });

      await prisma.dailyListen.create({
        data: {
          userId,
          date: day3,
          albums: {
            create: {
              albumId: testAlbum.albumId,
              albumName: testAlbum.albumName,
              artistNames: testAlbum.artistNames,
              imageUrl: testAlbum.imageUrl,
              listenMethod: 'spotify',
              listenOrder: 'ordered',
              listenTime: 'noon',
            },
          },
        },
      });

      // When
      const result = await service.getListensInRange(userId, {
        start: day1,
        end: day3,
      });

      // Then
      expect(result).toHaveLength(3);
      expect(result[1]).toMatchObject({
        date: missingDay.toISOString(),
        albums: [],
      });
    });

    it('should return multiple albums for the same day', async () => {
      // Given
      const day = new Date('2026-01-10T00:00:00.000Z');

      const album1 = album({ albumId: 'album-1' });
      const album2 = album({ albumId: 'album-2' });

      await prisma.dailyListen.create({
        data: {
          userId,
          date: day,
          albums: {
            create: [
              {
                albumId: album1.albumId,
                albumName: album1.albumName,
                artistNames: album1.artistNames,
                imageUrl: album1.imageUrl,
                listenMethod: 'spotify',
                listenOrder: 'ordered',
                listenTime: 'morning',
              },
              {
                albumId: album2.albumId,
                albumName: album2.albumName,
                artistNames: album2.artistNames,
                imageUrl: album2.imageUrl,
                listenMethod: 'vinyl',
                listenOrder: 'shuffled',
                listenTime: 'evening',
              },
            ],
          },
        },
      });

      // When
      const result = await service.getListensInRange(userId, {
        start: day,
        end: day,
      });

      // Then
      expect(result).toHaveLength(1);
      expect(result[0].albums).toHaveLength(2);
      expect(result[0]).toMatchObject({
        date: day.toISOString(),
        albums: expect.arrayContaining([
          expect.objectContaining({
            album: expect.objectContaining({ albumId: 'album-1' }),
          }),
          expect.objectContaining({
            album: expect.objectContaining({ albumId: 'album-2' }),
          }),
        ]),
      });
    });

    it('should return empty albums array for days with no listens', async () => {
      // Given - no listens in database
      const start = new Date('2026-01-10T00:00:00.000Z');
      const end = new Date('2026-01-12T00:00:00.000Z');

      // When
      const result = await service.getListensInRange(userId, {
        start,
        end,
      });

      // Then
      expect(result).toHaveLength(3);
      for (const dailyListen of result) {
        expect(dailyListen.albums).toEqual([]);
      }
    });

    describe('auto-fetch today', () => {
      beforeEach(() => {
        // Ensure auto-fetch is enabled
        delete process.env.DISABLE_AUTO_FETCH;
      });

      it('should auto-fetch today when today is in range and missing', async () => {
        // Given
        const { album: spotifyAlbum, history } = createFullAlbumPlayHistory({
          date: '2026-01-15',
        });

        mockGetRecentlyPlayedTracks.mockResolvedValue(
          recentlyPlayed({ items: history }),
        );

        const start = new Date('2026-01-14T00:00:00.000Z');
        const end = new Date('2026-01-15T23:59:59.999Z');

        // When
        const result = await service.getListensInRange(userId, {
          start,
          end,
        });

        // Then
        expect(mockGetRecentlyPlayedTracks).toHaveBeenCalled();
        expect(result).toHaveLength(2);

        // Find today's entry
        const todayEntry = result.find(
          (r) =>
            new Date(r.date).toISOString().split('T')[0] ===
            startOfToday.toISOString().split('T')[0],
        );

        expect(todayEntry).toBeDefined();
        expect(todayEntry?.albums).toHaveLength(1);
        expect(todayEntry?.albums[0]).toMatchObject({
          album: expect.objectContaining({
            albumId: spotifyAlbum.id,
          }),
        });
      });

      it('should not auto-fetch if today is not in range', async () => {
        // Given
        const start = new Date('2026-01-10T00:00:00.000Z');
        const end = new Date('2026-01-12T00:00:00.000Z');

        // When
        const result = await service.getListensInRange(userId, {
          start,
          end,
        });

        // Then
        expect(mockGetRecentlyPlayedTracks).not.toHaveBeenCalled();
        expect(result).toHaveLength(3);
      });

      it('should not auto-fetch if today already exists in database', async () => {
        // Given
        const testAlbum = album();

        await prisma.dailyListen.create({
          data: {
            userId,
            date: startOfToday,
            albums: {
              create: {
                albumId: testAlbum.albumId,
                albumName: testAlbum.albumName,
                artistNames: testAlbum.artistNames,
                imageUrl: testAlbum.imageUrl,
                listenMethod: 'spotify',
                listenOrder: 'ordered',
                listenTime: 'noon',
              },
            },
          },
        });

        // When
        const result = await service.getListensInRange(userId, {
          start: startOfToday,
          end: startOfToday,
        });

        // Then
        expect(mockGetRecentlyPlayedTracks).not.toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0].albums).toHaveLength(1);
      });

      it('should not auto-fetch when DISABLE_AUTO_FETCH is true', async () => {
        // Given
        process.env.DISABLE_AUTO_FETCH = 'true';

        const start = new Date('2026-01-14T00:00:00.000Z');
        const end = new Date('2026-01-15T23:59:59.999Z');

        // When
        const result = await service.getListensInRange(userId, {
          start,
          end,
        });

        // Then
        expect(mockGetRecentlyPlayedTracks).not.toHaveBeenCalled();
        expect(result).toHaveLength(2);

        // Today should be empty
        const todayEntry = result.find(
          (r) =>
            new Date(r.date).toISOString().split('T')[0] ===
            startOfToday.toISOString().split('T')[0],
        );

        expect(todayEntry?.albums).toEqual([]);
      });

      it('should handle auto-fetch returning no albums', async () => {
        // Given
        mockGetRecentlyPlayedTracks.mockResolvedValue(
          recentlyPlayed({ items: [] }),
        );

        const start = new Date('2026-01-14T00:00:00.000Z');
        const end = new Date('2026-01-15T23:59:59.999Z');

        // When
        const result = await service.getListensInRange(userId, {
          start,
          end,
        });

        // Then
        expect(mockGetRecentlyPlayedTracks).toHaveBeenCalled();
        expect(result).toHaveLength(2);

        // Today should be empty since no albums were returned
        const todayEntry = result.find(
          (r) =>
            new Date(r.date).toISOString().split('T')[0] ===
            startOfToday.toISOString().split('T')[0],
        );

        expect(todayEntry?.albums).toEqual([]);
      });
    });

    it('should only return listens for the specified user', async () => {
      // Given
      const otherUser = await prisma.user.create({
        data: userCreateInput(),
        select: { id: true },
      });

      const day = new Date('2026-01-10T00:00:00.000Z');
      const testAlbum = album();

      // Create listen for the main user
      await prisma.dailyListen.create({
        data: {
          userId,
          date: day,
          albums: {
            create: {
              albumId: testAlbum.albumId,
              albumName: testAlbum.albumName,
              artistNames: testAlbum.artistNames,
              imageUrl: testAlbum.imageUrl,
              listenMethod: 'spotify',
              listenOrder: 'ordered',
              listenTime: 'noon',
            },
          },
        },
      });

      // Create listen for other user
      await prisma.dailyListen.create({
        data: {
          userId: otherUser.id,
          date: day,
          albums: {
            create: {
              albumId: 'other-album',
              albumName: 'Other Album',
              artistNames: 'Other Artist',
              imageUrl: 'https://example.com/other.jpg',
              listenMethod: 'vinyl',
              listenOrder: 'shuffled',
              listenTime: 'evening',
            },
          },
        },
      });

      // When
      const result = await service.getListensInRange(userId, {
        start: day,
        end: day,
      });

      // Then
      expect(result).toHaveLength(1);
      expect(result[0].albums).toHaveLength(1);
      expect(result[0].albums[0]).toMatchObject({
        album: expect.objectContaining({
          albumId: testAlbum.albumId,
        }),
      });
    });
  });
});
