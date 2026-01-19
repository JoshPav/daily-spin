import type { PlaylistType } from '@prisma/client';
import type { SpotifyApi } from '@spotify/web-api-ts-sdk';
import type { ConsolaInstance } from 'consola';
import { UserPlaylistRepository } from '~~/server/repositories/userPlaylist.repository';
import type { UserWithAuthTokens } from '../user.service';
import { SpotifyService } from './spotify.service';

export type PlaylistConfig = {
  type: PlaylistType;
  name: string;
  description: string;
};

type SpotifyContext = {
  spotifyClient: SpotifyApi;
  spotifyUserId: string;
};

export abstract class PlaylistService {
  constructor(
    private logger: ConsolaInstance,
    private spotifyService: SpotifyService = new SpotifyService(),
    private userPlaylistRepo = new UserPlaylistRepository(),
  ) {}

  protected async getSpotifyContext(
    user: UserWithAuthTokens,
  ): Promise<SpotifyContext> {
    const spotifyClient = await this.spotifyService.getClientForUser(
      user.id,
      user.auth,
    );
    const spotifyUser = await spotifyClient.currentUser.profile();
    return { spotifyClient, spotifyUserId: spotifyUser.id };
  }

  /**
   * Creates or updates the daily-spin playlist for today's scheduled album
   * @returns Playlist details or null if no album scheduled
   */
  protected async upsertSpotifyPlaylist(
    userId: string,
    spotifyUserId: string,
    spotifyClient: SpotifyApi,
    trackUris: string[],
    config: PlaylistConfig,
  ) {
    const { playlistId, isNew } = await this.getOrCreatePlaylist(
      userId,
      spotifyUserId,
      spotifyClient,
      config,
    );

    await this.updatePlaylist(spotifyClient, playlistId, trackUris, config);

    this.logger.info('Successfully updated playlist', {
      userId,
      playlistId,
      name: config.name,
      type: config.type,
      trackCount: trackUris.length,
      isNew,
    });

    return {
      playlistId,
      trackCount: trackUris.length,
      isNew,
    };
  }

  private async getOrCreatePlaylist(
    userId: string,
    spotifyUserId: string,
    spotifyClient: SpotifyApi,
    playlistConfig: PlaylistConfig,
  ): Promise<{ playlistId: string; isNew: boolean }> {
    const existingPlaylist = await this.userPlaylistRepo.getByType(
      userId,
      playlistConfig.type,
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
      this.logger.info('Existing playlist was deleted, creating new one', {
        userId,
        oldPlaylistId: existingPlaylist.spotifyPlaylistId,
      });
    }

    // Create new playlist
    const playlist = await this.createSpotifyPlaylist(
      spotifyClient,
      spotifyUserId,
      playlistConfig,
    );

    // Save to database (upsert handles both insert and update)
    await this.userPlaylistRepo.upsert(
      userId,
      playlistConfig.type,
      playlist.id,
    );

    this.logger.info('Created new playlist and saved to database', {
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

  private async updatePlaylist(
    spotifyClient: SpotifyApi,
    playlistId: string,
    trackUris: string[],
    playlistConfig: PlaylistConfig,
  ): Promise<void> {
    await spotifyClient.playlists.changePlaylistDetails(playlistId, {
      name: playlistConfig.name,
      description: playlistConfig.description,
    });

    // Replace all tracks (clears existing and adds new in one call)
    await spotifyClient.playlists.updatePlaylistItems(playlistId, {
      uris: trackUris,
    });
  }

  private async createSpotifyPlaylist(
    spotifyClient: SpotifyApi,
    spotifyUserId: string,
    { name, description }: PlaylistConfig,
  ): Promise<{ id: string }> {
    this.logger.debug('Creating Spotify playlist', { spotifyUserId, name });

    return spotifyClient.playlists.createPlaylist(spotifyUserId, {
      name,
      description,
      public: false,
    });
  }
}
