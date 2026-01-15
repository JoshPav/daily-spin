import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
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

  beforeAll(async () => {
    handler = (await import('./index.get')).default;
  });

  beforeEach(async () => {
    userId = (await createUser()).id;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when user has no future listens', async () => {
    // When
    const result = await handler(createHandlerEvent(userId));

    // Then
    expect(result.items).toEqual([]);
  });

  it('should return all future listens for a user', async () => {
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

    // When
    const result = await handler(createHandlerEvent(userId));

    // Then
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      date: date1.toISOString(),
      album: {
        spotifyId: testAlbumItem.spotifyId,
        name: testAlbumItem.name,
        imageUrl: testAlbumItem.imageUrl,
      },
    });
    expect(result.items[1]).toMatchObject({
      date: date2.toISOString(),
      album: {
        spotifyId: 'album-2',
        name: 'Second Album',
      },
    });
  });

  it('should only return future listens for the authenticated user', async () => {
    // Given
    const otherUserId = (await createUser()).id;

    await createFutureListen({
      userId,
      item: { ...testAlbumItem, date: new Date('2026-01-20') },
    });

    await createFutureListen({
      userId: otherUserId,
      item: {
        spotifyId: 'other-album',
        name: 'Other Album',
        artists: [{ spotifyId: 'artist-2', name: 'Artist 2' }],
        date: new Date('2026-01-21'),
      },
    });

    // When
    const result = await handler(createHandlerEvent(userId));

    // Then
    expect(result.items).toHaveLength(1);
    expect(result.items[0].album.spotifyId).toBe(testAlbumItem.spotifyId);
  });

  it('should return future listens sorted by date ascending', async () => {
    // Given
    const date1 = new Date('2026-01-25');
    const date2 = new Date('2026-01-20');
    const date3 = new Date('2026-01-22');

    await createFutureListen({
      userId,
      item: {
        spotifyId: 'album-1',
        name: 'Album 1',
        artists: [{ spotifyId: 'artist-1', name: 'Artist 1' }],
        date: date1,
      },
    });

    await createFutureListen({
      userId,
      item: {
        spotifyId: 'album-2',
        name: 'Album 2',
        artists: [{ spotifyId: 'artist-2', name: 'Artist 2' }],
        date: date2,
      },
    });

    await createFutureListen({
      userId,
      item: {
        spotifyId: 'album-3',
        name: 'Album 3',
        artists: [{ spotifyId: 'artist-3', name: 'Artist 3' }],
        date: date3,
      },
    });

    // When
    const result = await handler(createHandlerEvent(userId));

    // Then
    expect(result.items).toHaveLength(3);
    expect(result.items[0].date).toBe(date2.toISOString());
    expect(result.items[1].date).toBe(date3.toISOString());
    expect(result.items[2].date).toBe(date1.toISOString());
  });

  it('should include all album fields in response', async () => {
    // Given
    await createFutureListen({
      userId,
      item: { ...testAlbumItem, date: new Date('2026-01-20') },
    });

    // When
    const result = await handler(createHandlerEvent(userId));

    // Then
    expect(result.items).toHaveLength(1);
    const item = result.items[0];

    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('date');
    expect(item.album).toHaveProperty('spotifyId');
    expect(item.album).toHaveProperty('name');
    expect(item.album).toHaveProperty('imageUrl');
    expect(item.album).toHaveProperty('artists');
    expect(item.album.artists).toHaveLength(1);
    expect(item.album.artists[0]).toMatchObject({
      spotifyId: testAlbumItem.artists[0].spotifyId,
      name: testAlbumItem.artists[0].name,
    });
  });

  it('should handle albums with multiple artists', async () => {
    // Given
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
        date: new Date('2026-01-20'),
      },
    });

    // When
    const result = await handler(createHandlerEvent(userId));

    // Then
    expect(result.items).toHaveLength(1);
    expect(result.items[0].album.artists).toHaveLength(3);
    expect(result.items[0].album.artists).toEqual([
      expect.objectContaining({ spotifyId: 'artist-1', name: 'Artist 1' }),
      expect.objectContaining({ spotifyId: 'artist-2', name: 'Artist 2' }),
      expect.objectContaining({ spotifyId: 'artist-3', name: 'Artist 3' }),
    ]);
  });

  it('should handle null imageUrl', async () => {
    // Given
    await createFutureListen({
      userId,
      item: {
        spotifyId: 'no-image-album',
        name: 'No Image Album',
        artists: [{ spotifyId: 'artist-1', name: 'Artist 1' }],
        date: new Date('2026-01-20'),
      },
    });

    // When
    const result = await handler(createHandlerEvent(userId));

    // Then
    expect(result.items).toHaveLength(1);
    expect(result.items[0].album.imageUrl).toBeNull();
  });

  it('should handle multiple future listens on different dates', async () => {
    // Given
    const date1 = new Date('2026-01-20');
    const date2 = new Date('2026-01-21');

    await createFutureListen({
      userId,
      item: {
        spotifyId: 'album-1',
        name: 'Album 1',
        artists: [{ spotifyId: 'artist-1', name: 'Artist 1' }],
        date: date1,
      },
    });

    await createFutureListen({
      userId,
      item: {
        spotifyId: 'album-2',
        name: 'Album 2',
        artists: [{ spotifyId: 'artist-2', name: 'Artist 2' }],
        date: date2,
      },
    });

    // When
    const result = await handler(createHandlerEvent(userId));

    // Then
    expect(result.items).toHaveLength(2);
    expect(result.items[0].date).toBe(date1.toISOString());
    expect(result.items[1].date).toBe(date2.toISOString());
  });
});
