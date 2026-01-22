import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  createDailyListens,
  createScheduledListen,
  createUser,
  getAlbumBySpotifyId,
  getAllListensForUser,
  getArtistBySpotifyId,
  getScheduledListensForUser,
} from '~~/tests/db/utils';
import { createHandlerEvent } from '~~/tests/factories/api.factory';
import { albumListenInput } from '~~/tests/factories/prisma.factory';
import type { EventHandler } from '~~/tests/mocks/nitroMock';

const testAlbumItem = {
  spotifyId: 'test-album-id',
  name: 'Test Album',
  imageUrl: 'https://example.com/image.jpg',
  artists: [{ spotifyId: 'artist-1', name: 'Test Artist' }],
};

describe('DELETE /api/listens/scheduled/[id] Integration Tests', () => {
  let userId: string;
  let handler: EventHandler;

  beforeAll(async () => {
    handler = (await import('./[id].delete')).default;
  });

  beforeEach(async () => {
    userId = (await createUser()).id;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should delete an existing scheduled listen successfully', async () => {
    // Given
    const item = await createScheduledListen({
      userId,
      item: { ...testAlbumItem, date: new Date('2026-01-20') },
    });

    // When
    const result = await handler(
      createHandlerEvent(userId, { params: { id: item.id } }),
    );

    // Then
    expect(result).toBeUndefined();

    const remainingItems = await getScheduledListensForUser(userId);
    expect(remainingItems).toHaveLength(0);
  });

  it('should return 404 when scheduled listen does not exist', async () => {
    // Given
    const nonExistentId = 'non-existent-id';

    // When/Then
    await expect(
      handler(createHandlerEvent(userId, { params: { id: nonExistentId } })),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Scheduled listen not found',
    });
  });

  it('should return 404 when scheduled listen belongs to different user', async () => {
    // Given
    const otherUser = await createUser();
    const item = await createScheduledListen({
      userId: otherUser.id,
      item: { ...testAlbumItem, date: new Date('2026-01-20') },
    });

    // When/Then
    await expect(
      handler(createHandlerEvent(userId, { params: { id: item.id } })),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Scheduled listen not found',
    });

    // Verify item still exists for original user
    const otherUserItems = await getScheduledListensForUser(otherUser.id);
    expect(otherUserItems).toHaveLength(1);
  });

  it('should return 400 when id param is missing', async () => {
    // When/Then
    await expect(
      handler(createHandlerEvent(userId, { params: {} })),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('should not affect daily listens for the same album', async () => {
    // Given
    const sharedSpotifyId = 'shared-album-id';
    const scheduledListenItem = await createScheduledListen({
      userId,
      item: {
        ...testAlbumItem,
        spotifyId: sharedSpotifyId,
        date: new Date('2026-01-20'),
      },
    });
    await createDailyListens({
      userId,
      date: new Date('2026-01-15'),
      albumListen: albumListenInput({
        album: { spotifyId: sharedSpotifyId },
      }),
    });

    // When
    await handler(
      createHandlerEvent(userId, { params: { id: scheduledListenItem.id } }),
    );

    // Then
    const remainingScheduledListens = await getScheduledListensForUser(userId);
    expect(remainingScheduledListens).toHaveLength(0);

    const dailyListens = await getAllListensForUser(userId);
    expect(dailyListens).toHaveLength(1);
    expect(dailyListens[0].albums[0].album.spotifyId).toBe(sharedSpotifyId);
  });

  it('should not delete the related album and artists', async () => {
    // Given
    const item = await createScheduledListen({
      userId,
      item: { ...testAlbumItem, date: new Date('2026-01-20') },
    });

    // When
    await handler(createHandlerEvent(userId, { params: { id: item.id } }));

    // Then
    const remainingItems = await getScheduledListensForUser(userId);
    expect(remainingItems).toHaveLength(0);

    // Album should still exist
    const album = await getAlbumBySpotifyId(testAlbumItem.spotifyId);
    expect(album).not.toBeNull();
    expect(album?.name).toBe(testAlbumItem.name);

    // Artist should still exist
    const artist = await getArtistBySpotifyId(
      testAlbumItem.artists[0].spotifyId,
    );
    expect(artist).not.toBeNull();
    expect(artist?.name).toBe(testAlbumItem.artists[0].name);
  });

  it('should only delete the specified scheduled listen, not others', async () => {
    // Given
    const item1 = await createScheduledListen({
      userId,
      item: { ...testAlbumItem, date: new Date('2026-01-20') },
    });
    const item2 = await createScheduledListen({
      userId,
      item: {
        spotifyId: 'album-2',
        name: 'Album 2',
        artists: [{ spotifyId: 'artist-2', name: 'Artist 2' }],
        date: new Date('2026-01-21'),
      },
    });

    // When
    await handler(createHandlerEvent(userId, { params: { id: item1.id } }));

    // Then
    const remainingItems = await getScheduledListensForUser(userId);
    expect(remainingItems).toHaveLength(1);
    expect(remainingItems[0].id).toBe(item2.id);
  });

  it('should handle deleting when multiple users have scheduled listens for same album', async () => {
    // Given
    const otherUserId = (await createUser()).id;

    const item1 = await createScheduledListen({
      userId,
      item: { ...testAlbumItem, date: new Date('2026-01-20') },
    });

    const item2 = await createScheduledListen({
      userId: otherUserId,
      item: { ...testAlbumItem, date: new Date('2026-01-21') },
    });

    // When
    await handler(createHandlerEvent(userId, { params: { id: item1.id } }));

    // Then
    const user1Items = await getScheduledListensForUser(userId);
    const user2Items = await getScheduledListensForUser(otherUserId);

    expect(user1Items).toHaveLength(0);
    expect(user2Items).toHaveLength(1);
    expect(user2Items[0].id).toBe(item2.id);

    // Album should still exist for the other user
    const album = await getAlbumBySpotifyId(testAlbumItem.spotifyId);
    expect(album).not.toBeNull();
  });
});
