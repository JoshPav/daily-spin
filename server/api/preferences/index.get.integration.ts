import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GetPreferencesResponse } from '~~/shared/schema';
import { createUser, createUserPlaylist } from '~~/tests/db/utils';
import { createHandlerEvent } from '~~/tests/factories/api.factory';
import type { EventHandler } from '~~/tests/mocks/nitroMock';

describe('GET /api/preferences Integration Tests', () => {
  let userId: string;
  let handler: EventHandler<GetPreferencesResponse>;

  beforeEach(async () => {
    const user = await createUser();
    userId = user.id;

    handler = (await import('./index.get')).default;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return user preferences with default values', async () => {
    // When
    const result = await handler(createHandlerEvent(userId, {}));

    // Then
    expect(result).toEqual({
      preferences: {
        trackListeningHistory: true,
        createTodaysAlbumPlaylist: true,
        createSongOfDayPlaylist: true,
      },
      linkedPlaylists: [],
    });
  });

  it('should return linked playlists when they exist', async () => {
    // Given
    const albumPlaylistId = 'spotify-album-playlist-123';
    const songPlaylistId = 'spotify-song-playlist-456';

    await createUserPlaylist({
      userId,
      playlistType: 'album_of_the_day',
      spotifyPlaylistId: albumPlaylistId,
    });

    await createUserPlaylist({
      userId,
      playlistType: 'song_of_the_day',
      spotifyPlaylistId: songPlaylistId,
    });

    // When
    const result = await handler(createHandlerEvent(userId, {}));

    // Then
    expect(result.linkedPlaylists).toHaveLength(2);
    expect(result.linkedPlaylists).toEqual(
      expect.arrayContaining([
        {
          type: 'album_of_the_day',
          spotifyPlaylistId: albumPlaylistId,
          spotifyUrl: `https://open.spotify.com/playlist/${albumPlaylistId}`,
        },
        {
          type: 'song_of_the_day',
          spotifyPlaylistId: songPlaylistId,
          spotifyUrl: `https://open.spotify.com/playlist/${songPlaylistId}`,
        },
      ]),
    );
  });

  it('should only return playlists for the authenticated user', async () => {
    // Given
    const otherUser = await createUser();

    const userPlaylistId = 'user-playlist-123';
    const otherUserPlaylistId = 'other-user-playlist-456';

    await createUserPlaylist({
      userId,
      playlistType: 'album_of_the_day',
      spotifyPlaylistId: userPlaylistId,
    });

    await createUserPlaylist({
      userId: otherUser.id,
      playlistType: 'album_of_the_day',
      spotifyPlaylistId: otherUserPlaylistId,
    });

    // When
    const result = await handler(createHandlerEvent(userId, {}));

    // Then
    expect(result.linkedPlaylists).toHaveLength(1);
    expect(result.linkedPlaylists[0].spotifyPlaylistId).toBe(userPlaylistId);
  });

  it('should return single playlist when user has only one type', async () => {
    // Given
    const playlistId = 'spotify-album-playlist-123';

    await createUserPlaylist({
      userId,
      playlistType: 'album_of_the_day',
      spotifyPlaylistId: playlistId,
    });

    // When
    const result = await handler(createHandlerEvent(userId, {}));

    // Then
    expect(result.linkedPlaylists).toHaveLength(1);
    expect(result.linkedPlaylists[0]).toEqual({
      type: 'album_of_the_day',
      spotifyPlaylistId: playlistId,
      spotifyUrl: `https://open.spotify.com/playlist/${playlistId}`,
    });
  });

  it('should include all preference fields in response', async () => {
    // When
    const result = await handler(createHandlerEvent(userId, {}));

    // Then
    expect(result.preferences).toHaveProperty('trackListeningHistory');
    expect(result.preferences).toHaveProperty('createTodaysAlbumPlaylist');
    expect(result.preferences).toHaveProperty('createSongOfDayPlaylist');
    expect(typeof result.preferences.trackListeningHistory).toBe('boolean');
    expect(typeof result.preferences.createTodaysAlbumPlaylist).toBe('boolean');
    expect(typeof result.preferences.createSongOfDayPlaylist).toBe('boolean');
  });
});
