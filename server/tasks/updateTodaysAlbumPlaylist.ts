import { PlaylistService } from '../services/playlist.service';
import { SpotifyService } from '../services/spotify.service';
import { UserService } from '../services/user.service';
import { createTaggedLogger } from '../utils/logger';

const logger = createTaggedLogger('Task:UpdateTodaysAlbumPlaylist');

type TaskResult = {
  result: string;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  duration: number;
};

export const updateTodaysAlbumPlaylist = async (): Promise<TaskResult> => {
  const startTime = Date.now();
  logger.info('Starting updateTodaysAlbumPlaylist task');

  const userService = new UserService();
  const playlistService = new PlaylistService();
  const spotifyService = new SpotifyService();

  // Fetch users with the feature enabled
  const users = await userService.fetchUsersForPlaylistCreation();
  logger.info('Found users for playlist creation', {
    userCount: users.length,
  });

  if (users.length === 0) {
    const duration = Date.now() - startTime;
    logger.info('No users with playlist creation enabled', { duration });
    return {
      result: 'No users with playlist creation enabled',
      duration,
      total: 0,
      created: 0,
      failed: 0,
      skipped: 0,
      updated: 0,
    };
  }

  // Process users in parallel
  const results = await Promise.allSettled(
    users.map(async (user) => {
      const { id: userId, auth } = user;

      try {
        // Get Spotify client for user
        const spotifyClient = await spotifyService.getClientForUser(
          userId,
          auth,
        );

        // Get Spotify user ID
        const spotifyUser = await spotifyClient.currentUser.profile();
        const spotifyUserId = spotifyUser.id;

        // Create or update playlist
        const result = await playlistService.updateTodaysAlbumPlaylist(
          userId,
          spotifyUserId,
          spotifyClient,
        );

        if (result) {
          logger.info('Successfully processed user playlist', {
            userId,
            playlistId: result.playlistId,
            trackCount: result.trackCount,
            isNew: result.isNew,
          });
          return {
            userId,
            status: result.isNew ? 'created' : 'updated',
            playlistId: result.playlistId,
            trackCount: result.trackCount,
          };
        }
        return { userId, status: 'skipped', reason: 'no_album_scheduled' };
      } catch (error) {
        logger.error('Failed to update playlist for user', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        return { userId, status: 'failed', error: String(error) };
      }
    }),
  );

  // Aggregate results
  const summary = {
    total: results.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const value = result.value;
      if (value.status === 'created') summary.created++;
      else if (value.status === 'updated') summary.updated++;
      else if (value.status === 'skipped') summary.skipped++;
      else if (value.status === 'failed') summary.failed++;
    } else {
      summary.failed++;
    }
  }

  const duration = Date.now() - startTime;
  logger.info('Completed updateTodaysAlbumPlaylist task', {
    ...summary,
    duration,
  });

  return {
    result: `Created ${summary.created}, updated ${summary.updated}, skipped ${summary.skipped}, failed ${summary.failed}`,
    ...summary,
    duration,
  };
};

export default defineTask({
  meta: {
    name: 'updateTodaysAlbumPlaylist',
    description:
      'Creates or updates Spotify playlists for users with albums scheduled for today',
  },
  run: updateTodaysAlbumPlaylist,
});
