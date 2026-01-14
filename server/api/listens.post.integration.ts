import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddAlbumListenBody } from '~~/shared/schema';
import { userCreateInput } from '~~/tests/factories/prisma.factory';
import {
  addAlbumListenBody,
  album,
  listenMetadata,
} from '../../tests/factories/api.factory';
import {
  clearTestDatabase,
  getTestPrisma,
  setupTestDatabase,
  teardownTestDatabase,
} from '../../tests/setup/db';
import { DailyListenService } from '../services/dailyListen.service';

describe('POST /api/listens Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrisma>;
  let service: DailyListenService;
  let userId: string;

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
    const user = await prisma.user.create({
      data: userCreateInput(),
      select: { id: true },
    });
    userId = user.id;

    service = new DailyListenService(
      new (
        await import('../repositories/dailyListen.repository')
      ).DailyListenRepository(prisma),
      new (await import('../repositories/user.repository')).UserRepository(
        prisma,
      ),
    );
  });

  describe('addAlbumListen', () => {
    it('should save a new album listen to the database', async () => {
      // Given
      const testAlbum = album({
        albumId: 'album-123',
        albumName: 'Test Album',
        artistNames: 'Test Artist',
      });

      const body: AddAlbumListenBody = addAlbumListenBody({
        album: testAlbum,
        listenMetadata: listenMetadata({
          listenOrder: 'ordered',
          listenMethod: 'spotify',
          listenTime: 'noon',
        }),
        date: startOfDay.toISOString(),
      });

      // When
      await service.addAlbumListen(userId, body);

      // Then
      const savedListen = await prisma.dailyListen.findFirst({
        where: { userId },
        include: { albums: true },
      });

      expect(savedListen).toMatchObject({
        userId,
        date: startOfDay,
        albums: expect.arrayContaining([
          expect.objectContaining({
            albumId: 'album-123',
            albumName: 'Test Album',
            artistNames: 'Test Artist',
            listenOrder: 'ordered',
            listenMethod: 'spotify',
            listenTime: 'noon',
          }),
        ]),
      });
    });

    it('should save album listen with vinyl listen method', async () => {
      // Given
      const testAlbum = album();
      const body: AddAlbumListenBody = addAlbumListenBody({
        album: testAlbum,
        listenMetadata: listenMetadata({
          listenMethod: 'vinyl',
          listenTime: 'evening',
        }),
        date: startOfDay.toISOString(),
      });

      // When
      await service.addAlbumListen(userId, body);

      // Then
      const savedListen = await prisma.dailyListen.findFirst({
        where: { userId },
        include: { albums: true },
      });

      expect(savedListen?.albums[0]).toMatchObject({
        albumId: testAlbum.albumId,
        listenMethod: 'vinyl',
        listenTime: 'evening',
      });
    });

    it('should save album listen with streamed listen method', async () => {
      // Given
      const testAlbum = album();
      const body: AddAlbumListenBody = addAlbumListenBody({
        album: testAlbum,
        listenMetadata: listenMetadata({
          listenMethod: 'streamed',
          listenTime: 'morning',
        }),
        date: startOfDay.toISOString(),
      });

      // When
      await service.addAlbumListen(userId, body);

      // Then
      const savedListen = await prisma.dailyListen.findFirst({
        where: { userId },
        include: { albums: true },
      });

      expect(savedListen?.albums[0]).toMatchObject({
        albumId: testAlbum.albumId,
        listenMethod: 'streamed',
        listenTime: 'morning',
      });
    });

    it('should save album listen with shuffled listen order', async () => {
      // Given
      const testAlbum = album();
      const body: AddAlbumListenBody = addAlbumListenBody({
        album: testAlbum,
        listenMetadata: listenMetadata({
          listenOrder: 'shuffled',
        }),
        date: startOfDay.toISOString(),
      });

      // When
      await service.addAlbumListen(userId, body);

      // Then
      const savedListen = await prisma.dailyListen.findFirst({
        where: { userId },
        include: { albums: true },
      });

      expect(savedListen?.albums[0]).toMatchObject({
        albumId: testAlbum.albumId,
        listenOrder: 'shuffled',
      });
    });

    it('should save album listen with interrupted listen order', async () => {
      // Given
      const testAlbum = album();
      const body: AddAlbumListenBody = addAlbumListenBody({
        album: testAlbum,
        listenMetadata: listenMetadata({
          listenOrder: 'interrupted',
        }),
        date: startOfDay.toISOString(),
      });

      // When
      await service.addAlbumListen(userId, body);

      // Then
      const savedListen = await prisma.dailyListen.findFirst({
        where: { userId },
        include: { albums: true },
      });

      expect(savedListen?.albums[0]).toMatchObject({
        albumId: testAlbum.albumId,
        listenOrder: 'interrupted',
      });
    });

    it('should save album listen with null listen time', async () => {
      // Given
      const testAlbum = album();
      const body: AddAlbumListenBody = addAlbumListenBody({
        album: testAlbum,
        listenMetadata: listenMetadata({
          listenTime: null,
        }),
        date: startOfDay.toISOString(),
      });

      // When
      await service.addAlbumListen(userId, body);

      // Then
      const savedListen = await prisma.dailyListen.findFirst({
        where: { userId },
        include: { albums: true },
      });

      expect(savedListen?.albums[0]).toMatchObject({
        albumId: testAlbum.albumId,
        listenTime: null,
      });
    });

    it('should add multiple albums to the same day', async () => {
      // Given
      const album1 = album({ albumId: 'album-1', albumName: 'Album 1' });
      const album2 = album({ albumId: 'album-2', albumName: 'Album 2' });

      const body1: AddAlbumListenBody = addAlbumListenBody({
        album: album1,
        listenMetadata: listenMetadata({ listenTime: 'morning' }),
        date: startOfDay.toISOString(),
      });

      const body2: AddAlbumListenBody = addAlbumListenBody({
        album: album2,
        listenMetadata: listenMetadata({ listenTime: 'evening' }),
        date: startOfDay.toISOString(),
      });

      // When
      await service.addAlbumListen(userId, body1);
      await service.addAlbumListen(userId, body2);

      // Then
      const savedListen = await prisma.dailyListen.findFirst({
        where: { userId },
        include: { albums: true },
      });

      expect(savedListen?.albums).toHaveLength(2);
      expect(savedListen).toMatchObject({
        userId,
        date: startOfDay,
        albums: expect.arrayContaining([
          expect.objectContaining({
            albumId: 'album-1',
            albumName: 'Album 1',
            listenTime: 'morning',
          }),
          expect.objectContaining({
            albumId: 'album-2',
            albumName: 'Album 2',
            listenTime: 'evening',
          }),
        ]),
      });
    });

    it('should save albums for different days separately', async () => {
      // Given
      const day1 = new Date('2026-01-01T00:00:00.000Z');
      const day2 = new Date('2026-01-02T00:00:00.000Z');

      const album1 = album({ albumId: 'album-1' });
      const album2 = album({ albumId: 'album-2' });

      const body1: AddAlbumListenBody = addAlbumListenBody({
        album: album1,
        date: day1.toISOString(),
      });

      const body2: AddAlbumListenBody = addAlbumListenBody({
        album: album2,
        date: day2.toISOString(),
      });

      // When
      await service.addAlbumListen(userId, body1);
      await service.addAlbumListen(userId, body2);

      // Then
      const day1Listen = await prisma.dailyListen.findFirst({
        where: { userId, date: day1 },
        include: { albums: true },
      });

      const day2Listen = await prisma.dailyListen.findFirst({
        where: { userId, date: day2 },
        include: { albums: true },
      });

      expect(day1Listen?.albums).toHaveLength(1);
      expect(day1Listen?.albums[0]).toMatchObject({ albumId: 'album-1' });

      expect(day2Listen?.albums).toHaveLength(1);
      expect(day2Listen?.albums[0]).toMatchObject({ albumId: 'album-2' });
    });

    it('should save album with all listen times', async () => {
      // Given
      const listenTimes = ['morning', 'noon', 'evening', 'night'] as const;
      const albums = listenTimes.map((_time, i) =>
        album({ albumId: `album-${i}` }),
      );

      // When
      for (const [i, time] of listenTimes.entries()) {
        const body: AddAlbumListenBody = addAlbumListenBody({
          album: albums[i],
          listenMetadata: listenMetadata({ listenTime: time }),
          date: startOfDay.toISOString(),
        });
        await service.addAlbumListen(userId, body);
      }

      // Then
      const savedListen = await prisma.dailyListen.findFirst({
        where: { userId },
        include: { albums: true },
      });

      expect(savedListen?.albums).toHaveLength(4);
      for (const [i, time] of listenTimes.entries()) {
        expect(savedListen?.albums[i]).toMatchObject({
          albumId: `album-${i}`,
          listenTime: time,
        });
      }
    });
  });
});
