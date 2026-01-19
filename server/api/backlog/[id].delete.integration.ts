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
  createBacklogItem,
  createDailyListens,
  createUser,
  getAlbumBySpotifyId,
  getAllListensForUser,
  getArtistBySpotifyId,
  getBacklogItemsForUser,
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

describe('DELETE /api/backlog/[id] Integration Tests', () => {
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

  it('should delete an existing backlog item successfully', async () => {
    // Given
    const item = await createBacklogItem({ userId, item: testAlbumItem });

    // When
    const result = await handler(
      createHandlerEvent(userId, { params: { id: item.id } }),
    );

    // Then
    expect(result).toBeNull();

    const remainingItems = await getBacklogItemsForUser(userId);
    expect(remainingItems).toHaveLength(0);
  });

  it('should return 404 when item does not exist', async () => {
    // Given
    const nonExistentId = 'non-existent-id';

    // When/Then
    await expect(
      handler(createHandlerEvent(userId, { params: { id: nonExistentId } })),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Backlog item not found',
    });
  });

  it('should return 404 when item belongs to different user', async () => {
    // Given
    const otherUser = await createUser();
    const item = await createBacklogItem({
      userId: otherUser.id,
      item: testAlbumItem,
    });

    // When/Then
    await expect(
      handler(createHandlerEvent(userId, { params: { id: item.id } })),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Backlog item not found',
    });

    // Verify item still exists for original user
    const otherUserItems = await getBacklogItemsForUser(otherUser.id);
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
    const backlogItem = await createBacklogItem({
      userId,
      item: {
        ...testAlbumItem,
        spotifyId: sharedSpotifyId,
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
      createHandlerEvent(userId, { params: { id: backlogItem.id } }),
    );

    // Then
    const remainingBacklogItems = await getBacklogItemsForUser(userId);
    expect(remainingBacklogItems).toHaveLength(0);

    const dailyListens = await getAllListensForUser(userId);
    expect(dailyListens).toHaveLength(1);
    expect(dailyListens[0].albums[0].album.spotifyId).toBe(sharedSpotifyId);
  });

  it('should not delete the related album and artists', async () => {
    // Given
    const item = await createBacklogItem({ userId, item: testAlbumItem });

    // When
    await handler(createHandlerEvent(userId, { params: { id: item.id } }));

    // Then
    const remainingItems = await getBacklogItemsForUser(userId);
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
});
