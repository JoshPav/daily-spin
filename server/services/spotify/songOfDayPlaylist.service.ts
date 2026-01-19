import { PlaylistType } from '@prisma/client';
import type { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { DailyListenRepository } from '~~/server/repositories/dailyListen.repository';
import { UserRepository } from '~~/server/repositories/user.repository';
import { UserPlaylistRepository } from '~~/server/repositories/userPlaylist.repository';
import { createTaggedLogger } from '~~/server/utils/logger';

const logger = createTaggedLogger('Service:SongOfDayPlaylist');

export class SongOfDayPlaylistService {
  constructor(
    private dailyListenRepo = new DailyListenRepository(),
    private userPlaylistRepo = new UserPlaylistRepository(),
    private userRepo = new UserRepository(),
  ) {}

  /**
   * Updates the Song of the Day playlist with all favorite songs from the current year
   * @returns Playlist details or null if feature disabled or no favorites
   */
  async updateSongOfDayPlaylist(
    userId: string,
    spotifyUserId: string,
    spotifyClient: SpotifyApi,
  ): Promise<{
    playlistId: string;
    playlistUrl: string;
    trackCount: number;
    isNew: boolean;
  } | null> {
    logger.info('Updating Song of the Day playlist', { userId });

    // Check if user has feature enabled
    const preferences = await this.userRepo.getPreferences(userId);
    if (!preferences?.createSongOfDayPlaylist) {
      logger.debug('Song of day playlist feature disabled for user', {
        userId,
      });
      return null;
    }

    // Get current year
    const currentYear = new Date().getUTCFullYear();

    // Fetch all favorite songs for the year
    const favoriteSongs = await this.dailyListenRepo.getFavoriteSongsForYear(
      userId,
      currentYear,
    );

    logger.info('Found favorite songs for year', {
      userId,
      year: currentYear,
      count: favoriteSongs.length,
    });

    // Generate playlist name
    const playlistName = `DailySpin - Song of the Day ${currentYear}`;

    // Get or create playlist
    const { playlistId, isNew } = await this.getOrCreatePlaylist(
      userId,
      spotifyUserId,
      spotifyClient,
      playlistName,
    );

    // Build track URIs (Spotify track URIs are in the format: spotify:track:{id})
    const trackUris = favoriteSongs.map(
      (song) => `spotify:track:${song.favoriteSongId}`,
    );

    // Update playlist with all favorite songs
    await this.updatePlaylist(
      spotifyClient,
      playlistId,
      playlistName,
      trackUris,
    );

    const playlistUrl = `https://open.spotify.com/playlist/${playlistId}`;

    logger.info('Successfully updated Song of the Day playlist', {
      userId,
      playlistId,
      trackCount: favoriteSongs.length,
      isNew,
    });

    return {
      playlistId,
      playlistUrl,
      trackCount: favoriteSongs.length,
      isNew,
    };
  }

  /**
   * Gets existing playlist or creates a new one.
   * Handles case where user deleted the playlist (404) by creating a new one.
   */
  private async getOrCreatePlaylist(
    userId: string,
    spotifyUserId: string,
    spotifyClient: SpotifyApi,
    playlistName: string,
  ): Promise<{ playlistId: string; isNew: boolean }> {
    const existingPlaylist = await this.userPlaylistRepo.getByType(
      userId,
      PlaylistType.song_of_the_day,
    );

    if (existingPlaylist) {
      // Verify playlist still exists in Spotify
      const playlistExists = await this.checkPlaylistExists(
        spotifyClient,
        existingPlaylist.spotifyPlaylistId,
      );

      if (playlistExists) {
        return { playlistId: existingPlaylist.spotifyPlaylistId, isNew: false };
      }

      // Playlist was deleted by user, create a new one
      logger.info('Existing playlist was deleted, creating new one', {
        userId,
        oldPlaylistId: existingPlaylist.spotifyPlaylistId,
      });
    }

    // Create new playlist
    const playlist = await this.createSpotifyPlaylist(
      spotifyClient,
      spotifyUserId,
      playlistName,
    );

    // Save to database (upsert handles both insert and update)
    await this.userPlaylistRepo.upsert(
      userId,
      PlaylistType.song_of_the_day,
      playlist.id,
    );

    logger.info('Created new playlist and saved to database', {
      userId,
      playlistId: playlist.id,
    });

    return { playlistId: playlist.id, isNew: true };
  }

  private async checkPlaylistExists(
    spotifyClient: SpotifyApi,
    playlistId: string,
  ): Promise<boolean> {
    try {
      await spotifyClient.playlists.getPlaylist(playlistId);
      return true;
    } catch (error) {
      // 404 means playlist was deleted
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Updates playlist name and replaces all tracks
   */
  private async updatePlaylist(
    spotifyClient: SpotifyApi,
    playlistId: string,
    name: string,
    trackUris: string[],
  ): Promise<void> {
    // Update name and description
    await spotifyClient.playlists.changePlaylistDetails(playlistId, {
      name,
      description: `Auto-generated by DailySpin - Your favorite songs from ${new Date().getUTCFullYear()}`,
    });

    // Replace all tracks (clears existing and adds new in one call)
    await spotifyClient.playlists.updatePlaylistItems(playlistId, {
      uris: trackUris,
    });
  }

  private async createSpotifyPlaylist(
    spotifyClient: SpotifyApi,
    spotifyUserId: string,
    name: string,
  ): Promise<{ id: string }> {
    logger.debug('Creating Spotify playlist', { spotifyUserId, name });

    return spotifyClient.playlists.createPlaylist(spotifyUserId, {
      name,
      description: `Auto-generated by DailySpin - Your favorite songs from ${new Date().getUTCFullYear()}`,
      public: false,
    });
  }
}
