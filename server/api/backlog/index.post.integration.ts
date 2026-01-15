import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { AddBacklogItemsResponse } from '~~/shared/schema';
import { createUser, getAllBacklogItemsForUser } from '~~/tests/db/utils';
import {
  addBacklogItemBody,
  backlogArtist,
  createHandlerEvent,
} from '~~/tests/factories/api.factory';
import type { EventHandler } from '~~/tests/mocks/nitroMock';

describe('POST /api/backlog Integration Tests', () => {
  let userId: string;

  const today = new Date('2026-01-01T12:00:00.000Z');

  let handler: EventHandler<AddBacklogItemsResponse>;

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

  it('should create a backlog item successfully', async () => {
    // Given
    const item = addBacklogItemBody();
    const body = [item];

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    expect(result.added).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);

    const savedItems = await getAllBacklogItemsForUser(userId);
    expect(savedItems).toHaveLength(1);

    expect(result.added[0]).toMatchObject({
      spotifyId: item.spotifyId,
      name: item.name,
    });
  });

  it('should create multiple backlog items successfully', async () => {
    // Given
    const item1 = addBacklogItemBody();
    const item2 = addBacklogItemBody();
    const body = [item1, item2];

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    expect(result.added).toHaveLength(2);
    expect(result.skipped).toHaveLength(0);

    const savedItems = await getAllBacklogItemsForUser(userId);
    expect(savedItems).toHaveLength(2);
  });

  it('should return the created item with correct fields', async () => {
    // Given
    const artist = backlogArtist();
    const item = addBacklogItemBody({ artists: [artist] });
    const body = [item];

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    expect(result.added[0]).toMatchObject({
      spotifyId: item.spotifyId,
      name: item.name,
      imageUrl: item.imageUrl,
      artists: [
        {
          spotifyId: artist.spotifyId,
          name: artist.name,
        },
      ],
    });
    expect(result.added[0].id).toBeDefined();
    expect(result.added[0].createdAt).toBeDefined();
    expect(new Date(result.added[0].createdAt)).toBeInstanceOf(Date);
  });

  it('should skip duplicate items and return them in skipped array', async () => {
    // Given
    const item = addBacklogItemBody();
    const body = [item];

    // When - add first time
    await handler(createHandlerEvent(userId, { body }));

    // When - add second time
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    expect(result.added).toHaveLength(0);
    expect(result.skipped).toContain(item.spotifyId);

    const savedItems = await getAllBacklogItemsForUser(userId);
    expect(savedItems).toHaveLength(1);
  });

  it('should only create items for the authenticated user', async () => {
    // Given
    const otherUserId = (await createUser()).id;
    const item = addBacklogItemBody();
    const body = [item];

    // When
    await handler(createHandlerEvent(userId, { body }));

    // Then
    const userItems = await getAllBacklogItemsForUser(userId);
    const otherUserItems = await getAllBacklogItemsForUser(otherUserId);

    expect(userItems).toHaveLength(1);
    expect(otherUserItems).toHaveLength(0);
  });

  it('should handle empty array', async () => {
    // Given
    const body: never[] = [];

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    expect(result.added).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);

    const savedItems = await getAllBacklogItemsForUser(userId);
    expect(savedItems).toHaveLength(0);
  });

  it('should handle albums with multiple artists', async () => {
    // Given
    const artist1 = backlogArtist();
    const artist2 = backlogArtist();
    const item = addBacklogItemBody({ artists: [artist1, artist2] });
    const body = [item];

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    expect(result.added).toHaveLength(1);
    expect(result.added[0].artists).toHaveLength(2);
    expect(result.added[0].artists).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ spotifyId: artist1.spotifyId }),
        expect.objectContaining({ spotifyId: artist2.spotifyId }),
      ]),
    );
  });

  it('should handle optional fields being omitted', async () => {
    // Given
    const body = [
      {
        spotifyId: 'test-spotify-id',
        name: 'Test Album',
        artists: [{ spotifyId: 'artist-id', name: 'Test Artist' }],
      },
    ];

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    expect(result.added).toHaveLength(1);
    expect(result.added[0].imageUrl).toBeNull();
  });
});
