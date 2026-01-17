import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  GetPreferencesResponse,
  UpdatePreferencesBody,
} from '~~/shared/schema';
import { getTestPrisma } from '~~/tests/db/setup';
import { createUser, createUserPlaylist } from '~~/tests/db/utils';
import { createHandlerEvent } from '~~/tests/factories/api.factory';
import type { EventHandler } from '~~/tests/mocks/nitroMock';

describe('PATCH /api/preferences Integration Tests', () => {
  let userId: string;
  let handler: EventHandler<GetPreferencesResponse>;

  beforeEach(async () => {
    const user = await createUser();
    userId = user.id;

    handler = (await import('./preferences.patch')).default;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update single preference field', async () => {
    // Given
    const body: UpdatePreferencesBody = {
      trackListeningHistory: false,
    };

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    expect(result.preferences.trackListeningHistory).toBe(false);
    expect(result.preferences.createTodaysAlbumPlaylist).toBe(true); // unchanged
    expect(result.preferences.createSongOfDayPlaylist).toBe(true); // unchanged
  });

  it('should update multiple preference fields', async () => {
    // Given
    const body: UpdatePreferencesBody = {
      trackListeningHistory: false,
      createTodaysAlbumPlaylist: false,
      createSongOfDayPlaylist: true,
    };

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    expect(result.preferences.trackListeningHistory).toBe(false);
    expect(result.preferences.createTodaysAlbumPlaylist).toBe(false);
    expect(result.preferences.createSongOfDayPlaylist).toBe(true);
  });

  it('should persist preferences to database', async () => {
    // Given
    const body: UpdatePreferencesBody = {
      trackListeningHistory: false,
      createSongOfDayPlaylist: true,
    };

    // When
    await handler(createHandlerEvent(userId, { body }));

    // Then - verify in database
    const user = await getTestPrisma().user.findUnique({
      where: { id: userId },
      select: {
        trackListeningHistory: true,
        createTodaysAlbumPlaylist: true,
        createSongOfDayPlaylist: true,
      },
    });

    expect(user).toEqual({
      trackListeningHistory: false,
      createTodaysAlbumPlaylist: true, // unchanged
      createSongOfDayPlaylist: true,
    });
  });

  it('should return linked playlists in response', async () => {
    // Given
    const playlistId = 'spotify-album-playlist-123';
    await createUserPlaylist({
      userId,
      playlistType: 'album_of_the_day',
      spotifyPlaylistId: playlistId,
    });

    const body: UpdatePreferencesBody = {
      trackListeningHistory: false,
    };

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then
    expect(result.linkedPlaylists).toHaveLength(1);
    expect(result.linkedPlaylists[0]).toEqual({
      type: 'album_of_the_day',
      spotifyPlaylistId: playlistId,
      spotifyUrl: `https://open.spotify.com/playlist/${playlistId}`,
    });
  });

  it('should handle empty update body', async () => {
    // Given
    const body: UpdatePreferencesBody = {};

    // When
    const result = await handler(createHandlerEvent(userId, { body }));

    // Then - nothing should change
    expect(result.preferences.trackListeningHistory).toBe(true);
    expect(result.preferences.createTodaysAlbumPlaylist).toBe(true);
    expect(result.preferences.createSongOfDayPlaylist).toBe(true);
  });

  it('should only update preferences for authenticated user', async () => {
    // Given
    const otherUser = await createUser();

    const body: UpdatePreferencesBody = {
      trackListeningHistory: false,
    };

    // When
    await handler(createHandlerEvent(userId, { body }));

    // Then - other user should be unchanged
    const otherUserData = await getTestPrisma().user.findUnique({
      where: { id: otherUser.id },
      select: { trackListeningHistory: true },
    });

    expect(otherUserData?.trackListeningHistory).toBe(true); // default value
  });

  it('should allow toggling preference back and forth', async () => {
    // Given
    const toggleOffBody: UpdatePreferencesBody = {
      createTodaysAlbumPlaylist: false,
    };

    const toggleOnBody: UpdatePreferencesBody = {
      createTodaysAlbumPlaylist: true,
    };

    // When - toggle off
    const result1 = await handler(
      createHandlerEvent(userId, { body: toggleOffBody }),
    );
    expect(result1.preferences.createTodaysAlbumPlaylist).toBe(false);

    // When - toggle back on
    const result2 = await handler(
      createHandlerEvent(userId, { body: toggleOnBody }),
    );
    expect(result2.preferences.createTodaysAlbumPlaylist).toBe(true);

    // Then - verify final state in database
    const user = await getTestPrisma().user.findUnique({
      where: { id: userId },
      select: { createTodaysAlbumPlaylist: true },
    });

    expect(user?.createTodaysAlbumPlaylist).toBe(true);
  });
});
