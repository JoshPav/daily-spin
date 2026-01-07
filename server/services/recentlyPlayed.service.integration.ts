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
import multipleAlbumsTestData from '../../tests/data/multipleAlbums.testdata';
import {
  clearTestDatabase,
  getTestPrisma,
  setupTestDatabase,
  teardownTestDatabase,
} from '../../tests/setup/db';
import { DailyListenRepository } from '../repositories/dailyListen.repository';
import { RecentlyPlayedService } from './recentlyPlayed.service';

describe('RecentlyPlayedService Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrisma>;
  let mockSpotifyApi: SpotifyApi;
  let service: RecentlyPlayedService;
  let repository: DailyListenRepository;

  beforeAll(async () => {
    vi.setSystemTime(new Date('2026-01-07T12:00:00.000Z'));

    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    prisma = getTestPrisma();

    // Create mock Spotify API
    mockSpotifyApi = {
      player: {
        getRecentlyPlayedTracks: vi.fn(),
      },
    } as unknown as SpotifyApi;

    // Create repository with test Prisma client
    repository = new DailyListenRepository(prisma);
    service = new RecentlyPlayedService(mockSpotifyApi, repository);
  });

  describe('processTodaysListens', () => {
    it('should save complete albums to database when user listens to full albums', async () => {
      // Setup: Mock the Spotify API to return our test data
      vi.mocked(
        mockSpotifyApi.player.getRecentlyPlayedTracks,
      ).mockResolvedValue(multipleAlbumsTestData);

      // Create a test user
      const user = await prisma.user.create({
        data: {
          id: 'test-user-1',
        },
      });

      // Act: Process today's listens
      const result = await service.processTodaysListens(user.id);

      // Assert: Verify data was saved
      expect(result).toBeDefined();
      expect(result?.albums).toBeDefined();
      expect(result?.albums.length).toBeGreaterThan(0);

      // Verify the database contains the correct data
      const [savedListens] = await prisma.dailyListen.findMany({
        where: { userId: user.id },
        include: { albums: true },
      });

      expect(savedListens).toMatchObject({
        userId: user.id,
        date: new Date('2026-01-07T00:00:00.000Z'),
        albums: expect.arrayContaining([
          expect.objectContaining({
            albumId: '7iX7uCkSNnkuIMwbjl8Jpf',
            listenedInOrder: false,
          }),
          expect.objectContaining({
            albumId: '4I5zzKYd2SKDgZ9DRf5LVk',
            listenedInOrder: true,
          }),
        ]),
      });
    });
  });
});
