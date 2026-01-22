import { format } from 'date-fns';
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

import type { ScheduledListenItem } from '~~/shared/schema';
import {
  createScheduledListen,
  createUser,
  getAlbumBySpotifyId,
  getArtistBySpotifyId,
  getScheduledListensForUser,
} from '~~/tests/db/utils';
import {
  addScheduledListenBody,
  backlogArtist,
  createHandlerEvent,
} from '~~/tests/factories/api.factory';
import type { EventHandler } from '~~/tests/mocks/nitroMock';

describe('POST /api/listens/scheduled Integration Tests', () => {
  let userId: string;

  const today = new Date('2026-01-15T12:00:00.000Z');

  let handler: EventHandler<ScheduledListenItem>;

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

  it('should create a scheduled listen successfully', async () => {
    // Given
    const body = addScheduledListenBody();

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then - body.date is already in YYYY-MM-DD format
    expect(result).toMatchObject({
      date: body.date,
      album: {
        spotifyId: body.spotifyId,
        name: body.name,
        imageUrl: body.imageUrl,
      },
    });
    expect(result.id).toBeDefined();

    const savedItems = await getScheduledListensForUser(userId);
    expect(savedItems).toHaveLength(1);
  });

  it('should return the created item with correct fields', async () => {
    // Given
    const artist = backlogArtist();
    const body = addScheduledListenBody({ artists: [artist] });

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then - body.date is already in YYYY-MM-DD format
    expect(result).toMatchObject({
      date: body.date,
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

  it('should only create scheduled listens for the authenticated user', async () => {
    // Given
    const otherUserId = (await createUser()).id;
    const body = addScheduledListenBody();

    // When
    await handler(createHandlerEvent(userId, { body }));

    // Then
    const userItems = await getScheduledListensForUser(userId);
    const otherUserItems = await getScheduledListensForUser(otherUserId);

    expect(userItems).toHaveLength(1);
    expect(otherUserItems).toHaveLength(0);
  });

  it('should handle albums with multiple artists', async () => {
    // Given
    const artist1 = backlogArtist();
    const artist2 = backlogArtist();
    const body = addScheduledListenBody({ artists: [artist1, artist2] });

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
      date: '2026-01-20',
    };

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    expect(result.album.imageUrl).toBeNull();
  });

  it('should reuse existing artist when adding album with same artist', async () => {
    // Given - create first scheduled listen with an artist
    const sharedArtist = backlogArtist();
    const listen1 = addScheduledListenBody({
      artists: [sharedArtist],
      date: '2026-01-20',
    });
    await handler(createHandlerEvent(userId, { body: listen1 }));

    // When - add second scheduled listen with same artist
    const listen2 = addScheduledListenBody({
      artists: [sharedArtist],
      date: '2026-01-21',
    });
    const result = await handler(createHandlerEvent(userId, { body: listen2 }));

    // Then - both scheduled listens added, but artist should be reused (not duplicated)
    expect(result).toBeDefined();

    const savedItems = await getScheduledListensForUser(userId);
    expect(savedItems).toHaveLength(2);

    // Verify both albums reference the same artist
    const artist = await getArtistBySpotifyId(sharedArtist.spotifyId);
    expect(artist).not.toBeNull();

    // Both albums should have the same artist
    expect(savedItems[0].album.artists[0].artistId).toBe(artist?.id);
    expect(savedItems[1].album.artists[0].artistId).toBe(artist?.id);
  });

  it('should link to existing album without creating duplicate', async () => {
    // Given - first user adds a scheduled listen with an album
    const futureDate = '2026-01-20';
    const body = addScheduledListenBody({ date: futureDate });
    await handler(createHandlerEvent(userId, { body }));

    const albumBeforeSecondAdd = await getAlbumBySpotifyId(body.spotifyId);
    expect(albumBeforeSecondAdd).not.toBeNull();

    // When - second user adds scheduled listen for the same album
    const otherUserId = (await createUser()).id;
    const otherFutureDate = '2026-01-21';
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

    // Both users should have scheduled listens
    const user1Items = await getScheduledListensForUser(userId);
    const user2Items = await getScheduledListensForUser(otherUserId);

    expect(user1Items).toHaveLength(1);
    expect(user2Items).toHaveLength(1);

    // Both scheduled listens should reference the same album
    expect(user1Items[0].albumId).toBe(albumBeforeSecondAdd?.id);
    expect(user2Items[0].albumId).toBe(albumBeforeSecondAdd?.id);
  });

  it('should upsert when adding same album for same date', async () => {
    // Given - create a scheduled listen
    const futureDate = '2026-01-20';
    const body = addScheduledListenBody({ date: futureDate });
    const firstResult = await handler(createHandlerEvent(userId, { body }));

    // When - add same album for same date (should upsert)
    const secondResult = await handler(createHandlerEvent(userId, { body }));

    // Then - should return the same scheduled listen, not create a duplicate
    expect(secondResult.id).toBe(firstResult.id);

    const savedItems = await getScheduledListensForUser(userId);
    expect(savedItems).toHaveLength(1);
  });

  it('should allow same album on different dates', async () => {
    // Given
    const body1 = addScheduledListenBody({
      date: '2026-01-20',
    });
    await handler(createHandlerEvent(userId, { body: body1 }));

    // When - add same album for different date
    const body2 = {
      ...body1,
      date: '2026-01-21',
    };
    const result = await handler(createHandlerEvent(userId, { body: body2 }));

    // Then - should create separate scheduled listens
    expect(result).toBeDefined();

    const savedItems = await getScheduledListensForUser(userId);
    expect(savedItems).toHaveLength(2);
    expect(savedItems[0].albumId).toBe(savedItems[1].albumId);
  });

  it('should replace album when adding different album for same date', async () => {
    // Given
    const futureDate = '2026-01-20';
    const body1 = addScheduledListenBody({ date: futureDate });
    await handler(createHandlerEvent(userId, { body: body1 }));

    // When - add different album for same date (should replace)
    const body2 = addScheduledListenBody({ date: futureDate });
    const result = await handler(createHandlerEvent(userId, { body: body2 }));

    // Then - should have replaced the album for that date
    expect(result).toBeDefined();
    expect(result.album.spotifyId).toBe(body2.spotifyId);

    const savedItems = await getScheduledListensForUser(userId);
    expect(savedItems).toHaveLength(1);
    expect(savedItems[0].album.spotifyId).toBe(body2.spotifyId);
  });

  it('should update existing scheduled listen when upserting', async () => {
    // Given - create a scheduled listen for a date
    const futureDate = new Date('2026-01-20');
    await createScheduledListen({
      userId,
      item: {
        spotifyId: 'album-1',
        name: 'Album 1',
        artists: [{ spotifyId: 'artist-1', name: 'Artist 1' }],
        date: futureDate,
      },
    });

    const itemsBefore = await getScheduledListensForUser(userId);
    expect(itemsBefore).toHaveLength(1);
    expect(itemsBefore[0].album.spotifyId).toBe('album-1');

    // When - add different album for the same date (should replace)
    const body = addScheduledListenBody({
      spotifyId: 'album-2',
      date: toDateString(futureDate),
    });
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then - should have replaced the album for that date
    expect(result.album.spotifyId).toBe('album-2');

    const itemsAfter = await getScheduledListensForUser(userId);
    expect(itemsAfter).toHaveLength(1);
    expect(itemsAfter[0].album.spotifyId).toBe('album-2');
  });
});
