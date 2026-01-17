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
import {
  createUser,
  getAlbumBySpotifyId,
  getArtistBySpotifyId,
  getBacklogItemsForUser,
} from '~~/tests/db/utils';
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

    const savedItems = await getBacklogItemsForUser(userId);
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

    const savedItems = await getBacklogItemsForUser(userId);
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
    expect(result.added[0].addedAt).toBeDefined();
    expect(new Date(result.added[0].addedAt)).toBeInstanceOf(Date);
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

    const savedItems = await getBacklogItemsForUser(userId);
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
    const userItems = await getBacklogItemsForUser(userId);
    const otherUserItems = await getBacklogItemsForUser(otherUserId);

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

    const savedItems = await getBacklogItemsForUser(userId);
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

  it('should reuse existing artist when adding album with same artist', async () => {
    // Given - create first album with an artist
    const sharedArtist = backlogArtist();
    const album1 = addBacklogItemBody({ artists: [sharedArtist] });
    await handler(createHandlerEvent(userId, { body: [album1] }));

    // When - add second album with same artist
    const album2 = addBacklogItemBody({ artists: [sharedArtist] });
    const result = await handler(
      createHandlerEvent(userId, { body: [album2] }),
    );

    // Then - both albums added, but artist should be reused (not duplicated)
    expect(result.added).toHaveLength(1);

    const savedItems = await getBacklogItemsForUser(userId);
    expect(savedItems).toHaveLength(2);

    // Verify both albums reference the same artist
    const artist = await getArtistBySpotifyId(sharedArtist.spotifyId);
    expect(artist).not.toBeNull();

    // Both albums should have the same artist
    expect(savedItems[0].album.artists[0].artistId).toBe(artist?.id);
    expect(savedItems[1].album.artists[0].artistId).toBe(artist?.id);
  });

  it('should link to existing album without creating duplicate', async () => {
    // Given - first user adds an album
    const album = addBacklogItemBody();
    await handler(createHandlerEvent(userId, { body: [album] }));

    const albumBeforeSecondAdd = await getAlbumBySpotifyId(album.spotifyId);
    expect(albumBeforeSecondAdd).not.toBeNull();

    // When - second user adds the same album
    const otherUserId = (await createUser()).id;
    const result = await handler(
      createHandlerEvent(otherUserId, { body: [album] }),
    );

    // Then - album is linked, not duplicated
    expect(result.added).toHaveLength(1);

    const albumAfterSecondAdd = await getAlbumBySpotifyId(album.spotifyId);
    expect(albumAfterSecondAdd).not.toBeNull();

    // Should be the same album record (same id)
    expect(albumAfterSecondAdd?.id).toBe(albumBeforeSecondAdd?.id);

    // Both users should have the album in their backlog
    const user1Items = await getBacklogItemsForUser(userId);
    const user2Items = await getBacklogItemsForUser(otherUserId);

    expect(user1Items).toHaveLength(1);
    expect(user2Items).toHaveLength(1);

    // Both backlog items should reference the same album
    expect(user1Items[0].albumId).toBe(albumBeforeSecondAdd?.id);
    expect(user2Items[0].albumId).toBe(albumBeforeSecondAdd?.id);
  });
});
