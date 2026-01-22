import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GetBacklogResponse } from '~~/shared/schema';
import {
  type CreateBacklogItemInput,
  createBacklogItem,
  createUser,
} from '~~/tests/db/utils';
import { createHandlerEvent } from '~~/tests/factories/api.factory';
import type { EventHandler } from '~~/tests/mocks/nitroMock';

describe('GET /api/backlog Integration Tests', () => {
  let userId: string;
  let handler: EventHandler<GetBacklogResponse>;

  beforeEach(async () => {
    const user = await createUser();
    userId = user.id;

    handler = (await import('./index.get')).default;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createAlbumInput = (
    overrides: Partial<CreateBacklogItemInput> = {},
  ): CreateBacklogItemInput => ({
    spotifyId: `spotify-${Math.random().toString(36).slice(2)}`,
    name: 'Test Album',
    imageUrl: 'https://example.com/image.jpg',
    artists: [{ spotifyId: 'artist-1', name: 'Test Artist' }],
    ...overrides,
  });

  it('should return empty albums array when no backlog items exist', async () => {
    // When
    const result = await handler(createHandlerEvent(userId, {}));

    // Then
    expect(result).toEqual({
      albums: [],
    });
  });

  it('should return albums with correct structure', async () => {
    // Given
    const albumInput = createAlbumInput({
      spotifyId: 'album-123',
      name: 'Test Album',
      imageUrl: 'https://example.com/image.jpg',
      artists: [
        { spotifyId: 'artist-1', name: 'Artist One' },
        { spotifyId: 'artist-2', name: 'Artist Two' },
      ],
    });
    const createdItem = await createBacklogItem({ userId, item: albumInput });

    // When
    const result = await handler(createHandlerEvent(userId, {}));

    // Then
    expect(result.albums).toHaveLength(1);
    expect(result.albums[0]).toEqual({
      id: createdItem.id,
      spotifyId: albumInput.spotifyId,
      name: albumInput.name,
      imageUrl: albumInput.imageUrl,
      releaseDate: null,
      artists: [
        { spotifyId: 'artist-1', name: 'Artist One', imageUrl: undefined },
        { spotifyId: 'artist-2', name: 'Artist Two', imageUrl: undefined },
      ],
      addedAt: createdItem.createdAt.toISOString(),
    });
  });

  it('should only return items for the authenticated user', async () => {
    // Given
    const otherUser = await createUser();

    const mainUserAlbum = createAlbumInput({ name: 'Main User Album' });
    const createdItem = await createBacklogItem({
      userId,
      item: mainUserAlbum,
    });

    const otherUserAlbum = createAlbumInput({ name: 'Other User Album' });
    await createBacklogItem({ userId: otherUser.id, item: otherUserAlbum });

    // When
    const result = await handler(createHandlerEvent(userId, {}));

    // Then
    expect(result.albums).toHaveLength(1);
    expect(result.albums[0].name).toBe(mainUserAlbum.name);
    expect(result.albums[0].id).toBe(createdItem.id);
  });

  it('should order items by createdAt descending', async () => {
    // Given
    const olderDate = new Date('2026-01-10T12:00:00.000Z');
    const newerDate = new Date('2026-01-14T12:00:00.000Z');

    const olderAlbum = createAlbumInput({
      name: 'Older Album',
      createdAt: olderDate,
    });
    const newerAlbum = createAlbumInput({
      name: 'Newer Album',
      createdAt: newerDate,
    });

    await createBacklogItem({ userId, item: olderAlbum });
    await createBacklogItem({ userId, item: newerAlbum });

    // When
    const result = await handler(createHandlerEvent(userId, {}));

    // Then
    expect(result.albums).toHaveLength(2);
    expect(result.albums[0].name).toBe('Newer Album');
    expect(result.albums[1].name).toBe('Older Album');
  });

  it('should return multiple albums', async () => {
    // Given
    const album1 = createAlbumInput({ name: 'Album One' });
    const album2 = createAlbumInput({ name: 'Album Two' });
    const album3 = createAlbumInput({ name: 'Album Three' });

    await createBacklogItem({ userId, item: album1 });
    await createBacklogItem({ userId, item: album2 });
    await createBacklogItem({ userId, item: album3 });

    // When
    const result = await handler(createHandlerEvent(userId, {}));

    // Then
    expect(result.albums).toHaveLength(3);
    expect(result.albums.map((a) => a.name)).toContain('Album One');
    expect(result.albums.map((a) => a.name)).toContain('Album Two');
    expect(result.albums.map((a) => a.name)).toContain('Album Three');
  });
});
