import { tz } from '@date-fns/tz';
import { startOfDay } from 'date-fns';
import { DailyListenRepository } from '~~/server/repositories/dailyListen.repository';
import { UserRepository } from '~~/server/repositories/user.repository';
import { SongOfDayPlaylistService } from '~~/server/services/spotify/songOfDayPlaylist.service';
import { SpotifyService } from '~~/server/services/spotify/spotify.service';
import { NotFoundError } from '~~/server/utils/errors';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { updateFavoriteSongSchema } from '~~/shared/schemas/listens.schema';

export default createEventHandler(updateFavoriteSongSchema, async (event) => {
  const log = createContextLogger(event, 'API:favorite-song.patch');
  const { date: parsedDate } = event.validatedParams;
  const body = event.validatedBody;
  const { userId } = event.context;

  const date = startOfDay(parsedDate, { in: tz('UTC') });

  // Determine if clearing or setting favorite song
  const isClearing = body.spotifyId === null;
  const favoriteSong = isClearing ? null : body;

  log.info('Updating favorite song for daily listen', {
    date: date.toISOString(),
    isClearing,
  });

  const repository = new DailyListenRepository();

  try {
    await repository.updateFavoriteSong(userId, date, favoriteSong);
  } catch (error) {
    // Handle Prisma P2025 (record not found)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2025'
    ) {
      throw new NotFoundError('Daily listen', { date: date.toISOString() });
    }
    throw error;
  }

  log.info('Successfully updated favorite song', {
    date: date.toISOString(),
  });

  // Update Song of the Day playlist (don't block on failure)
  try {
    const userRepo = new UserRepository();
    const spotifyService = new SpotifyService();

    const user = await userRepo.getUser(userId);
    const account = user?.accounts[0];

    if (account) {
      const auth = {
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        accessTokenExpiresAt: account.accessTokenExpiresAt,
        scope: account.scope,
      };

      const spotifyClient = await spotifyService.getClientForUser(userId, auth);
      const playlistService = new SongOfDayPlaylistService();

      await playlistService.updateSongOfDayPlaylist(
        userId,
        account.accountId,
        spotifyClient,
      );

      log.info('Successfully updated Song of the Day playlist');
    }
  } catch (playlistError) {
    // Log but don't fail the request if playlist update fails
    log.error('Failed to update Song of the Day playlist', {
      error:
        playlistError instanceof Error
          ? playlistError.message
          : 'Unknown error',
      stack: playlistError instanceof Error ? playlistError.stack : undefined,
    });
  }

  return {
    favoriteSong,
  };
});
