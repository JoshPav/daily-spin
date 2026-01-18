import { tz } from '@date-fns/tz';
import { startOfDay } from 'date-fns';
import { updateFavoriteSongSchema } from '~~/shared/schemas/listens.schema';
import { DailyListenRepository } from '../../../repositories/dailyListen.repository';
import { UserRepository } from '../../../repositories/user.repository';
import { SongOfDayPlaylistService } from '../../../services/songOfDayPlaylist.service';
import { SpotifyService } from '../../../services/spotify.service';
import { NotFoundError } from '../../../utils/errors';
import { createEventHandler } from '../../../utils/handler';
import { createTaggedLogger } from '../../../utils/logger';

const logger = createTaggedLogger('API:favorite-song.patch');

export default createEventHandler(updateFavoriteSongSchema, async (event) => {
  const { date: parsedDate } = event.validatedParams;
  const body = event.validatedBody;
  const { userId } = event.context;
  const { logContext } = event;

  const date = startOfDay(parsedDate, { in: tz('UTC') });

  // Determine if clearing or setting favorite song
  const isClearing = body.spotifyId === null;
  const favoriteSong = isClearing ? null : body;

  logger.info('Updating favorite song for daily listen', {
    ...logContext,
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

  logger.info('Successfully updated favorite song', {
    ...logContext,
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

      logger.info('Successfully updated Song of the Day playlist', {
        ...logContext,
      });
    }
  } catch (playlistError) {
    // Log but don't fail the request if playlist update fails
    logger.error('Failed to update Song of the Day playlist', {
      ...logContext,
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
