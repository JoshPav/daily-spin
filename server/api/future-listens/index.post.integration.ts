import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { FutureListenItem } from '~~/shared/schema';
import {
  createFutureListen,
  createUser,
  getAlbumBySpotifyId,
  getArtistBySpotifyId,
  getFutureListensForUser,
} from '~~/tests/db/utils';
import {
  addFutureListenBody,
  backlogArtist,
  createHandlerEvent,
} from '~~/tests/factories/api.factory';
import type { EventHandler } from '~~/tests/mocks/nitroMock';

describe('POST /api/future-listens Integration Tests', () => {
  let userId: string;

  const today = new Date('2026-01-15T12:00:00.000Z');

  let handler: EventHandler<FutureListenItem>;

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

  it('should create a future listen successfully', async () => {
    // Given
    const body = addFutureListenBody();

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    const expectedDate = new Date(body.date);
    expectedDate.setUTCHours(0, 0, 0, 0);

    expect(result).toMatchObject({
      date: expectedDate.toISOString(),
      album: {
        spotifyId: body.spotifyId,
        name: body.name,
        imageUrl: body.imageUrl,
      },
    });
    expect(result.id).toBeDefined();

    const savedItems = await getFutureListensForUser(userId);
    expect(savedItems).toHaveLength(1);
  });

  it('should return the created item with correct fields', async () => {
    // Given
    const artist = backlogArtist();
    const body = addFutureListenBody({ artists: [artist] });

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    const expectedDate = new Date(body.date);
    expectedDate.setUTCHours(0, 0, 0, 0);

    expect(result).toMatchObject({
      date: expectedDate.toISOString(),
      album: {
        spotifyId: body.spotifyId,
        name: body.name,
        imageUrl: body.imageUrl,
        artists: [
          {
            spotifyId: artist.spotifyId,
            name: artist.name,
          },
        ],
      },
    });
    expect(result.id).toBeDefined();
  });

  it('should only create future listens for the authenticated user', async () => {
    // Given
    const otherUserId = (await createUser()).id;
    const body = addFutureListenBody();

    // When
    await handler(createHandlerEvent(userId, { body }));

    // Then
    const userItems = await getFutureListensForUser(userId);
    const otherUserItems = await getFutureListensForUser(otherUserId);

    expect(userItems).toHaveLength(1);
    expect(otherUserItems).toHaveLength(0);
  });

  it('should handle albums with multiple artists', async () => {
    // Given
    const artist1 = backlogArtist();
    const artist2 = backlogArtist();
    const body = addFutureListenBody({ artists: [artist1, artist2] });

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    expect(result.album.artists).toHaveLength(2);
    expect(result.album.artists).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ spotifyId: artist1.spotifyId }),
        expect.objectContaining({ spotifyId: artist2.spotifyId }),
      ]),
    );
  });

  it('should handle optional fields being omitted', async () => {
    // Given
    const body = {
      spotifyId: 'test-spotify-id',
      name: 'Test Album',
      artists: [{ spotifyId: 'artist-id', name: 'Test Artist' }],
      date: new Date('2026-01-20').toISOString(),
    };

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    expect(result.album.imageUrl).toBeNull();
  });

  it('should reuse existing artist when adding album with same artist', async () => {
    // Given - create first future listen with an artist
    const sharedArtist = backlogArtist();
    const listen1 = addFutureListenBody({
      artists: [sharedArtist],
      date: new Date('2026-01-20').toISOString(),
    });
    await handler(createHandlerEvent(userId, { body: listen1 }));

    // When - add second future listen with same artist
    const listen2 = addFutureListenBody({
      artists: [sharedArtist],
      date: new Date('2026-01-21').toISOString(),
    });
    const result = await handler(createHandlerEvent(userId, { body: listen2 }));

    // Then - both future listens added, but artist should be reused (not duplicated)
    expect(result).toBeDefined();

    const savedItems = await getFutureListensForUser(userId);
    expect(savedItems).toHaveLength(2);

    // Verify both albums reference the same artist
    const artist = await getArtistBySpotifyId(sharedArtist.spotifyId);
    expect(artist).not.toBeNull();

    // Both albums should have the same artist
    expect(savedItems[0].album.artists[0].artistId).toBe(artist?.id);
    expect(savedItems[1].album.artists[0].artistId).toBe(artist?.id);
  });

  it('should link to existing album without creating duplicate', async () => {
    // Given - first user adds a future listen with an album
    const futureDate = new Date('2026-01-20').toISOString();
    const body = addFutureListenBody({ date: futureDate });
    await handler(createHandlerEvent(userId, { body }));

    const albumBeforeSecondAdd = await getAlbumBySpotifyId(body.spotifyId);
    expect(albumBeforeSecondAdd).not.toBeNull();

    // When - second user adds future listen for the same album
    const otherUserId = (await createUser()).id;
    const otherFutureDate = new Date('2026-01-21').toISOString();
    const result = await handler(
      createHandlerEvent(otherUserId, {
        body: { ...body, date: otherFutureDate },
      }),
    );

    // Then - album is linked, not duplicated
    expect(result).toBeDefined();

    const albumAfterSecondAdd = await getAlbumBySpotifyId(body.spotifyId);
    expect(albumAfterSecondAdd).not.toBeNull();

    // Should be the same album record (same id)
    expect(albumAfterSecondAdd?.id).toBe(albumBeforeSecondAdd?.id);

    // Both users should have future listens
    const user1Items = await getFutureListensForUser(userId);
    const user2Items = await getFutureListensForUser(otherUserId);

    expect(user1Items).toHaveLength(1);
    expect(user2Items).toHaveLength(1);

    // Both future listens should reference the same album
    expect(user1Items[0].albumId).toBe(albumBeforeSecondAdd?.id);
    expect(user2Items[0].albumId).toBe(albumBeforeSecondAdd?.id);
  });

  it('should upsert when adding same album for same date', async () => {
    // Given - create a future listen
    const futureDate = new Date('2026-01-20').toISOString();
    const body = addFutureListenBody({ date: futureDate });
    const firstResult = await handler(createHandlerEvent(userId, { body }));

    // When - add same album for same date (should upsert)
    const secondResult = await handler(createHandlerEvent(userId, { body }));

    // Then - should return the same future listen, not create a duplicate
    expect(secondResult.id).toBe(firstResult.id);

    const savedItems = await getFutureListensForUser(userId);
    expect(savedItems).toHaveLength(1);
  });

  it('should allow same album on different dates', async () => {
    // Given
    const body1 = addFutureListenBody({
      date: new Date('2026-01-20').toISOString(),
    });
    await handler(createHandlerEvent(userId, { body: body1 }));

    // When - add same album for different date
    const body2 = {
      ...body1,
      date: new Date('2026-01-21').toISOString(),
    };
    const result = await handler(createHandlerEvent(userId, { body: body2 }));

    // Then - should create separate future listens
    expect(result).toBeDefined();

    const savedItems = await getFutureListensForUser(userId);
    expect(savedItems).toHaveLength(2);
    expect(savedItems[0].albumId).toBe(savedItems[1].albumId);
  });

  it('should replace album when adding different album for same date', async () => {
    // Given
    const futureDate = new Date('2026-01-20').toISOString();
    const body1 = addFutureListenBody({ date: futureDate });
    await handler(createHandlerEvent(userId, { body: body1 }));

    // When - add different album for same date (should replace)
    const body2 = addFutureListenBody({ date: futureDate });
    const result = await handler(createHandlerEvent(userId, { body: body2 }));

    // Then - should have replaced the album for that date
    expect(result).toBeDefined();
    expect(result.album.spotifyId).toBe(body2.spotifyId);

    const savedItems = await getFutureListensForUser(userId);
    expect(savedItems).toHaveLength(1);
    expect(savedItems[0].album.spotifyId).toBe(body2.spotifyId);
  });

  it('should update existing future listen when upserting', async () => {
    // Given - create a future listen for a date
    const futureDate = new Date('2026-01-20');
    await createFutureListen({
      userId,
      item: {
        spotifyId: 'album-1',
        name: 'Album 1',
        artists: [{ spotifyId: 'artist-1', name: 'Artist 1' }],
        date: futureDate,
      },
    });

    const itemsBefore = await getFutureListensForUser(userId);
    expect(itemsBefore).toHaveLength(1);
    expect(itemsBefore[0].album.spotifyId).toBe('album-1');

    // When - add different album for the same date (should replace)
    const body = addFutureListenBody({
      spotifyId: 'album-2',
      date: futureDate.toISOString(),
    });
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then - should have replaced the album for that date
    expect(result.album.spotifyId).toBe('album-2');

    const itemsAfter = await getFutureListensForUser(userId);
    expect(itemsAfter).toHaveLength(1);
    expect(itemsAfter[0].album.spotifyId).toBe('album-2');
  });
});
