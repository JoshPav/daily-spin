import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type {
  AddAlbumListenBody,
  ListenMethod,
  ListenOrder,
  ListenTime,
} from '~~/shared/schema';
import { userCreateInput } from '~~/tests/factories/prisma.factory';
import {
  addAlbumListenBody,
  album,
  handlerEvent,
} from '../../tests/factories/api.factory';
import {
  clearTestDatabase,
  getTestPrisma,
  setupTestDatabase,
  teardownTestDatabase,
} from '../../tests/setup/db';

type EventHandler = ReturnType<typeof defineEventHandler>;
type HandlerEvent = Parameters<EventHandler>[0];

vi.stubGlobal('defineEventHandler', (handler: EventHandler) => handler);
vi.stubGlobal('readBody', (event: HandlerEvent) => {
  const body = (event as unknown as { _requestBody: string })._requestBody;
  return typeof body === 'string' ? JSON.parse(body) : undefined;
});

describe('POST /api/listens Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrisma>;
  let userId: string;

  const today = new Date('2026-01-01T12:00:00.000Z');
  const startOfDay = new Date('2026-01-01T00:00:00.000Z');

  let handler: EventHandler;

  beforeAll(async () => {
    vi.setSystemTime(today);
    await setupTestDatabase();

    handler = (await import('./listens.post')).default;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    prisma = getTestPrisma();
    vi.clearAllMocks();

    // Create a test user
    const user = await prisma.user.create({
      data: userCreateInput(),
      select: { id: true },
    });
    userId = user.id;
  });

  describe('addAlbumListen', () => {
    it.each<ListenMethod>([
      'spotify',
      'streamed',
      'vinyl',
    ])('should save album with $listenMethod listen method', async (listenMethod) => {
      // Give
      const body = addAlbumListenBody({ listenMetadata: { listenMethod } });

      // When
      await handler(
        handlerEvent({
          _requestBody: JSON.stringify(body),
          context: { userId, session: {} },
        }),
      );

      // Then
      const savedListens = await prisma.dailyListen.findMany({
        where: { userId },
        include: { albums: true },
      });

      expect(savedListens.length).toEqual(1);
      expect(savedListens[0].albums).toEqual([
        expect.objectContaining({
          albumId: body.album.albumId,
          listenTime: body.listenMetadata.listenTime,
        }),
      ]);
    });

    it.each<ListenOrder>([
      'interrupted',
      'ordered',
      'shuffled',
    ])('should save album with $listenOrder listen order', async (listenOrder) => {
      // Give
      const body = addAlbumListenBody({ listenMetadata: { listenOrder } });

      // When
      await handler(
        handlerEvent({
          _requestBody: JSON.stringify(body),
          context: { userId, session: {} },
        }),
      );

      // Then
      const savedListens = await prisma.dailyListen.findMany({
        where: { userId },
        include: { albums: true },
      });

      expect(savedListens.length).toEqual(1);
      expect(savedListens[0].albums).toEqual([
        expect.objectContaining({
          albumId: body.album.albumId,
          listenTime: body.listenMetadata.listenTime,
        }),
      ]);
    });

    it('should add multiple albums to the same day', async () => {
      // Given
      const album1 = album({ albumId: 'album-1', albumName: 'Album 1' });
      const album2 = album({ albumId: 'album-2', albumName: 'Album 2' });

      const body1: AddAlbumListenBody = addAlbumListenBody({
        album: album1,
        listenMetadata: {
          listenTime: 'morning',
          listenMethod: 'spotify',
          listenOrder: 'ordered',
        },
        date: startOfDay.toISOString(),
      });

      const body2: AddAlbumListenBody = addAlbumListenBody({
        album: album2,
        listenMetadata: {
          listenTime: 'evening',
          listenMethod: 'spotify',
          listenOrder: 'ordered',
        },
        date: startOfDay.toISOString(),
      });

      // When
      await handler(
        handlerEvent({
          _requestBody: JSON.stringify(body1),
          context: { userId, session: {} },
        }),
      );
      await handler(
        handlerEvent({
          _requestBody: JSON.stringify(body2),
          context: { userId, session: {} },
        }),
      );

      // Then
      const savedListens = await prisma.dailyListen.findFirst({
        where: { userId },
        include: { albums: true },
      });

      expect(savedListens?.albums).toHaveLength(2);
      expect(savedListens).toMatchObject({
        userId,
        date: startOfDay,
        albums: expect.arrayContaining([
          expect.objectContaining({
            albumId: body1.album.albumId,
            albumName: body1.album.albumName,
            listenTime: body1.listenMetadata.listenTime,
          }),
          expect.objectContaining({
            albumId: body2.album.albumId,
            albumName: body2.album.albumName,
            listenTime: body2.listenMetadata.listenTime,
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
        listenMetadata: {
          listenTime: 'noon',
          listenMethod: 'spotify',
          listenOrder: 'ordered',
        },
      });

      const body2: AddAlbumListenBody = addAlbumListenBody({
        album: album2,
        date: day2.toISOString(),
        listenMetadata: {
          listenTime: 'noon',
          listenMethod: 'spotify',
          listenOrder: 'ordered',
        },
      });

      // When
      await handler(
        handlerEvent({
          _requestBody: JSON.stringify(body1),
          context: { userId, session: {} },
        }),
      );
      await handler(
        handlerEvent({
          _requestBody: JSON.stringify(body2),
          context: { userId, session: {} },
        }),
      );

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
      expect(day1Listen?.albums[0]).toMatchObject({
        albumId: body1.album.albumId,
      });

      expect(day2Listen?.albums).toHaveLength(1);
      expect(day2Listen?.albums[0]).toMatchObject({
        albumId: body2.album.albumId,
      });
    });

    describe('listenTime', () => {
      it.each<ListenTime>([
        'morning',
        'noon',
        'evening',
        'night',
      ])('should save album with $listenTime listen time', async (listenTime) => {
        // Give
        const body = addAlbumListenBody({ listenMetadata: { listenTime } });

        // When
        await handler(
          handlerEvent({
            _requestBody: JSON.stringify(body),
            context: { userId, session: {} },
          }),
        );

        // Then
        const savedListens = await prisma.dailyListen.findMany({
          where: { userId },
          include: { albums: true },
        });

        expect(savedListens.length).toEqual(1);
        expect(savedListens[0].albums).toEqual([
          expect.objectContaining({
            albumId: body.album.albumId,
            listenTime: body.listenMetadata.listenTime,
          }),
        ]);
      });

      it('should save album listen with null listen time', async () => {
        // Given
        const body: AddAlbumListenBody = addAlbumListenBody({
          listenMetadata: {
            listenTime: null,
            listenMethod: 'spotify',
            listenOrder: 'ordered',
          },
        });

        // When
        await handler(
          handlerEvent({
            _requestBody: JSON.stringify(body),
            context: { userId, session: {} },
          }),
        );

        // Then
        const savedListens = await prisma.dailyListen.findFirst({
          where: { userId },
          include: { albums: true },
        });

        expect(savedListens?.albums).toEqual([
          expect.objectContaining({
            albumId: body.album.albumId,
            listenTime: body.listenMetadata.listenTime,
          }),
        ]);
      });
    });
  });
});
