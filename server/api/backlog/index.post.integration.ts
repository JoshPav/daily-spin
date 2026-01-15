import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { AddBacklogItemResponse } from '~~/shared/schema';
import { createUser, getAllBacklogItemsForUser } from '~~/tests/db/utils';
import {
  addBacklogItemBody,
  createHandlerEvent,
} from '~~/tests/factories/api.factory';
import type { EventHandler } from '~~/tests/mocks/nitroMock';

describe('POST /api/backlog Integration Tests', () => {
  let userId: string;

  const today = new Date('2026-01-01T12:00:00.000Z');

  let handler: EventHandler<AddBacklogItemResponse>;

  beforeAll(async () => {
    vi.setSystemTime(today);

    handler = (await import('./index.post')).default;
  });

  beforeEach(async () => {
    userId = (await createUser()).id;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create an album backlog item successfully', async () => {
    // Given
    const body = addBacklogItemBody({ type: 'album' });

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    const savedItems = await getAllBacklogItemsForUser(userId);

    expect(savedItems).toHaveLength(1);
    expect(savedItems[0]).toMatchObject({
      userId,
      type: 'album',
      spotifyId: body.spotifyId,
      name: body.name,
      imageUrl: body.imageUrl,
      artistNames: body.artistNames,
    });
    expect(result.id).toBe(savedItems[0].id);
  });

  it('should create an artist backlog item successfully', async () => {
    // Given
    const body = addBacklogItemBody({
      type: 'artist',
      artistNames: undefined,
    });

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    const savedItems = await getAllBacklogItemsForUser(userId);

    expect(savedItems).toHaveLength(1);
    expect(savedItems[0]).toMatchObject({
      userId,
      type: 'artist',
      spotifyId: body.spotifyId,
      name: body.name,
      imageUrl: body.imageUrl,
    });
    expect(result.id).toBe(savedItems[0].id);
  });

  it('should return the created item with correct fields', async () => {
    // Given
    const body = addBacklogItemBody();

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    expect(result).toMatchObject({
      type: body.type,
      spotifyId: body.spotifyId,
      name: body.name,
      imageUrl: body.imageUrl,
      artistNames: body.artistNames,
    });
    expect(result.id).toBeDefined();
    expect(result.addedAt).toBeDefined();
    expect(new Date(result.addedAt)).toBeInstanceOf(Date);
  });

  it('should handle duplicate items with unique constraint error', async () => {
    // Given
    const body = addBacklogItemBody();

    // When
    await handler(createHandlerEvent(userId, { body }));

    // Then
    await expect(
      handler(createHandlerEvent(userId, { body })),
    ).rejects.toThrow();

    const savedItems = await getAllBacklogItemsForUser(userId);
    expect(savedItems).toHaveLength(1);
  });

  it('should only create items for the authenticated user', async () => {
    // Given
    const otherUserId = (await createUser()).id;
    const body = addBacklogItemBody();

    // When
    await handler(createHandlerEvent(userId, { body }));

    // Then
    const userItems = await getAllBacklogItemsForUser(userId);
    const otherUserItems = await getAllBacklogItemsForUser(otherUserId);

    expect(userItems).toHaveLength(1);
    expect(otherUserItems).toHaveLength(0);
  });

  it('should allow same spotifyId with different types', async () => {
    // Given
    const spotifyId = 'shared-spotify-id';
    const albumBody = addBacklogItemBody({ type: 'album', spotifyId });
    const artistBody = addBacklogItemBody({ type: 'artist', spotifyId });

    // When
    await handler(createHandlerEvent(userId, { body: albumBody }));
    await handler(createHandlerEvent(userId, { body: artistBody }));

    // Then
    const savedItems = await getAllBacklogItemsForUser(userId);
    expect(savedItems).toHaveLength(2);
    expect(savedItems.map((item) => item.type)).toContain('album');
    expect(savedItems.map((item) => item.type)).toContain('artist');
  });

  it('should handle optional fields being omitted', async () => {
    // Given
    const body = {
      type: 'album' as const,
      spotifyId: 'test-spotify-id',
      name: 'Test Album',
    };

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    expect(result.imageUrl).toBeNull();
    expect(result.artistNames).toBeNull();

    const savedItems = await getAllBacklogItemsForUser(userId);
    expect(savedItems[0].imageUrl).toBeNull();
    expect(savedItems[0].artistNames).toBeNull();
  });
});
