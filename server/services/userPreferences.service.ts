import type {
  GetPreferencesResponse,
  LinkedPlaylist,
  UserPreferences,
} from '#shared/schema';
import { UserRepository } from '~~/server/repositories/user.repository';
import { NotFoundError } from '~~/server/utils/errors';
import { createTaggedLogger } from '~~/server/utils/logger';

const logger = createTaggedLogger('Service:UserPreferences');

export class UserPreferencesService {
  constructor(private userRepo = new UserRepository()) {}

  /**
   * Map playlist type to Spotify URL
   */
  private mapToLinkedPlaylist(
    playlistType: 'album_of_the_day' | 'song_of_the_day',
    spotifyPlaylistId: string,
  ): LinkedPlaylist {
    return {
      type: playlistType,
      spotifyPlaylistId,
      spotifyUrl: `https://open.spotify.com/playlist/${spotifyPlaylistId}`,
    };
  }

  async getPreferences(userId: string): Promise<GetPreferencesResponse> {
    logger.debug('Getting user preferences', { userId });

    const user = await this.userRepo.getPreferences(userId);

    if (!user) {
      throw new NotFoundError('User', { userId });
    }

    const preferences: UserPreferences = {
      trackListeningHistory: user.trackListeningHistory,
      createTodaysAlbumPlaylist: user.createTodaysAlbumPlaylist,
      createSongOfDayPlaylist: user.createSongOfDayPlaylist,
    };

    const linkedPlaylists: LinkedPlaylist[] = user.userPlaylists.map((up) =>
      this.mapToLinkedPlaylist(up.playlistType, up.spotifyPlaylistId),
    );

    logger.info('Successfully retrieved user preferences', {
      userId,
      playlistCount: linkedPlaylists.length,
    });

    return {
      preferences,
      linkedPlaylists,
    };
  }

  async updatePreferences(
    userId: string,
    preferences: {
      trackListeningHistory?: boolean;
      createTodaysAlbumPlaylist?: boolean;
      createSongOfDayPlaylist?: boolean;
    },
  ): Promise<GetPreferencesResponse> {
    logger.debug('Updating user preferences', { userId, preferences });

    const user = await this.userRepo.updatePreferences(userId, preferences);

    const updatedPreferences: UserPreferences = {
      trackListeningHistory: user.trackListeningHistory,
      createTodaysAlbumPlaylist: user.createTodaysAlbumPlaylist,
      createSongOfDayPlaylist: user.createSongOfDayPlaylist,
    };

    const linkedPlaylists: LinkedPlaylist[] = user.userPlaylists.map((up) =>
      this.mapToLinkedPlaylist(up.playlistType, up.spotifyPlaylistId),
    );

    logger.info('Successfully updated user preferences', {
      userId,
      updatedFields: Object.keys(preferences),
    });

    return {
      preferences: updatedPreferences,
      linkedPlaylists,
    };
  }
}
