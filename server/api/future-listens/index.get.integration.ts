import { addDays, format } from 'date-fns';
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

import type { GetFutureListensResponse } from '~~/shared/schema';
import { createFutureListen, createUser } from '~~/tests/db/utils';
import { createHandlerEvent } from '~~/tests/factories/api.factory';
import type { EventHandler } from '~~/tests/mocks/nitroMock';

const testAlbumItem = {
  spotifyId: 'test-album-id',
  name: 'Test Album',
  imageUrl: 'https://example.com/image.jpg',
  artists: [{ spotifyId: 'artist-1', name: 'Test Artist' }],
};

describe('GET /api/future-listens Integration Tests', () => {
  let userId: string;
  let handler: EventHandler<GetFutureListensResponse>;

  // Fixed "today" for consistent tests
  const today = new Date('2026-01-15T00:00:00.000Z');

  beforeAll(async () => {
    vi.setSystemTime(today);
    handler = (await import('./index.get')).default;
  });

  beforeEach(async () => {
    userId = (await createUser()).id;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /** Helper to count non-null items in the date-keyed response */
  const countItems = (items: Record<string, unknown>) =>
    Object.values(items).filter((v) => v !== null).length;

  describe('Basic functionality', () => {
    it('should return empty items (all nulls) when user has no future listens', async () => {
      // When
      const result = await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: toDateString(today),
            endDate: toDateString(addDays(today, 7)),
          },
        }),
      );

      // Then
      expect(countItems(result.items)).toBe(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should return future listens within date range', async () => {
      // Given
      const date1 = new Date('2026-01-20');
      const date2 = new Date('2026-01-25');

      await createFutureListen({
        userId,
        item: { ...testAlbumItem, date: date1 },
      });

      await createFutureListen({
        userId,
        item: {
          spotifyId: 'album-2',
          name: 'Second Album',
          imageUrl: 'https://example.com/image2.jpg',
          artists: [{ spotifyId: 'artist-2', name: 'Artist 2' }],
          date: date2,
        },
      });

      // When - request range that includes both dates
      const result = await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: toDateString(date1),
            endDate: toDateString(date2),
          },
        }),
      );

      // Then
      expect(countItems(result.items)).toBe(2);
      expect(result.items[toDateString(date1)]).toMatchObject({
        album: {
          spotifyId: testAlbumItem.spotifyId,
          name: testAlbumItem.name,
          imageUrl: testAlbumItem.imageUrl,
        },
      });
      expect(result.items[toDateString(date2)]).toMatchObject({
        album: {
          spotifyId: 'album-2',
          name: 'Second Album',
        },
      });
    });

    it('should only return future listens for the authenticated user', async () => {
      // Given
      const otherUserId = (await createUser()).id;
      const date = new Date('2026-01-20');

      await createFutureListen({
        userId,
        item: { ...testAlbumItem, date },
      });

      await createFutureListen({
        userId: otherUserId,
        item: {
          spotifyId: 'other-album',
          name: 'Other Album',
          artists: [{ spotifyId: 'artist-2', name: 'Artist 2' }],
          date,
        },
      });

      // When
      const result = await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: toDateString(date),
            endDate: toDateString(date),
          },
        }),
      );

      // Then
      expect(countItems(result.items)).toBe(1);
      expect(result.items[toDateString(date)]?.album.spotifyId).toBe(
        testAlbumItem.spotifyId,
      );
    });

    it('should include all album fields in response', async () => {
      // Given
      const date = new Date('2026-01-20');
      await createFutureListen({
        userId,
        item: { ...testAlbumItem, date },
      });

      // When
      const result = await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: toDateString(date),
            endDate: toDateString(date),
          },
        }),
      );

      // Then
      const item = result.items[toDateString(date)];
      expect(item).not.toBeNull();
      expect(item).toHaveProperty('id');
      expect(item?.album).toHaveProperty('spotifyId');
      expect(item?.album).toHaveProperty('name');
      expect(item?.album).toHaveProperty('imageUrl');
      expect(item?.album).toHaveProperty('artists');
      expect(item?.album.artists).toHaveLength(1);
      expect(item?.album.artists[0]).toMatchObject({
        spotifyId: testAlbumItem.artists[0].spotifyId,
        name: testAlbumItem.artists[0].name,
      });
    });

    it('should handle albums with multiple artists', async () => {
      // Given
      const date = new Date('2026-01-20');
      await createFutureListen({
        userId,
        item: {
          spotifyId: 'multi-artist-album',
          name: 'Multi Artist Album',
          artists: [
            { spotifyId: 'artist-1', name: 'Artist 1' },
            { spotifyId: 'artist-2', name: 'Artist 2' },
            { spotifyId: 'artist-3', name: 'Artist 3' },
          ],
          date,
        },
      });

      // When
      const result = await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: toDateString(date),
            endDate: toDateString(date),
          },
        }),
      );

      // Then
      const item = result.items[toDateString(date)];
      expect(item?.album.artists).toHaveLength(3);
      expect(item?.album.artists).toEqual([
        expect.objectContaining({ spotifyId: 'artist-1', name: 'Artist 1' }),
        expect.objectContaining({ spotifyId: 'artist-2', name: 'Artist 2' }),
        expect.objectContaining({ spotifyId: 'artist-3', name: 'Artist 3' }),
      ]);
    });

    it('should handle null imageUrl', async () => {
      // Given
      const date = new Date('2026-01-20');
      await createFutureListen({
        userId,
        item: {
          spotifyId: 'no-image-album',
          name: 'No Image Album',
          artists: [{ spotifyId: 'artist-1', name: 'Artist 1' }],
          date,
        },
      });

      // When
      const result = await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: toDateString(date),
            endDate: toDateString(date),
          },
        }),
      );

      // Then
      expect(result.items[toDateString(date)]?.album.imageUrl).toBeNull();
    });
  });

  describe('Pagination', () => {
    it('should return items only within the requested date range', async () => {
      // Given
      const date1 = new Date('2026-01-18');
      const date2 = new Date('2026-01-20');
      const date3 = new Date('2026-01-25'); // Outside requested range

      await createFutureListen({
        userId,
        item: {
          ...testAlbumItem,
          spotifyId: 'album-1',
          date: date1,
        },
      });

      await createFutureListen({
        userId,
        item: {
          ...testAlbumItem,
          spotifyId: 'album-2',
          date: date2,
        },
      });

      await createFutureListen({
        userId,
        item: {
          ...testAlbumItem,
          spotifyId: 'album-3',
          date: date3,
        },
      });

      // When - request range that only includes first two dates
      const result = await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: toDateString(date1),
            endDate: toDateString(date2),
          },
        }),
      );

      // Then
      expect(countItems(result.items)).toBe(2);
      expect(result.items[toDateString(date1)]).not.toBeNull();
      expect(result.items[toDateString(date2)]).not.toBeNull();
      expect(result.items[toDateString(date3)]).toBeUndefined();
    });

    it('should return hasMore=true when items exist beyond endDate', async () => {
      // Given
      const dateInRange = new Date('2026-01-18');
      const dateBeyondRange = new Date('2026-01-25');

      await createFutureListen({
        userId,
        item: { ...testAlbumItem, spotifyId: 'album-1', date: dateInRange },
      });

      await createFutureListen({
        userId,
        item: { ...testAlbumItem, spotifyId: 'album-2', date: dateBeyondRange },
      });

      // When
      const result = await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: toDateString(dateInRange),
            endDate: toDateString(new Date('2026-01-20')),
          },
        }),
      );

      // Then
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should return hasMore=false when no items exist beyond endDate', async () => {
      // Given
      const date = new Date('2026-01-18');

      await createFutureListen({
        userId,
        item: { ...testAlbumItem, date },
      });

      // When - end date is after the only item
      const result = await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: toDateString(date),
            endDate: toDateString(new Date('2026-01-25')),
          },
        }),
      );

      // Then
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should use default date range (today + 7 days) when no params provided', async () => {
      // Given - item within default range (today + 3 days)
      const dateInRange = addDays(today, 3);
      // Item outside default range (today + 10 days)
      const dateOutOfRange = addDays(today, 10);

      await createFutureListen({
        userId,
        item: { ...testAlbumItem, spotifyId: 'album-1', date: dateInRange },
      });

      await createFutureListen({
        userId,
        item: { ...testAlbumItem, spotifyId: 'album-2', date: dateOutOfRange },
      });

      // When - no query params (uses defaults)
      const result = await handler(createHandlerEvent(userId));

      // Then
      expect(result.pagination.startDate).toBe(toDateString(today));
      expect(result.pagination.endDate).toBe(toDateString(addDays(today, 7)));
      expect(countItems(result.items)).toBe(1);
      expect(result.items[toDateString(dateInRange)]).not.toBeNull();
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should return correct pagination metadata', async () => {
      // Given
      const date1 = new Date('2026-01-18');
      const date2 = new Date('2026-01-20');

      await createFutureListen({
        userId,
        item: { ...testAlbumItem, spotifyId: 'album-1', date: date1 },
      });

      await createFutureListen({
        userId,
        item: { ...testAlbumItem, spotifyId: 'album-2', date: date2 },
      });

      // When
      const result = await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: toDateString(date1),
            endDate: toDateString(date2),
          },
        }),
      );

      // Then
      expect(result.pagination).toEqual({
        startDate: toDateString(date1),
        endDate: toDateString(date2),
        total: 2,
        hasMore: false,
      });
    });

    it('should include all dates in range with null for empty days', async () => {
      // Given
      const startDate = new Date('2026-01-18');
      const endDate = new Date('2026-01-22');
      const itemDate = new Date('2026-01-20');

      await createFutureListen({
        userId,
        item: { ...testAlbumItem, date: itemDate },
      });

      // When
      const result = await handler(
        createHandlerEvent(userId, {
          query: {
            startDate: toDateString(startDate),
            endDate: toDateString(endDate),
          },
        }),
      );

      // Then - all 5 days should be present
      expect(Object.keys(result.items)).toHaveLength(5);
      expect(result.items['2026-01-18']).toBeNull();
      expect(result.items['2026-01-19']).toBeNull();
      expect(result.items['2026-01-20']).not.toBeNull();
      expect(result.items['2026-01-21']).toBeNull();
      expect(result.items['2026-01-22']).toBeNull();
    });
  });

  describe('Response structure', () => {
    it('should always include items and pagination in response', async () => {
      // When - no data, no params
      const result = await handler(createHandlerEvent(userId));

      // Then
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('startDate');
      expect(result.pagination).toHaveProperty('endDate');
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('hasMore');
    });
  });
});
