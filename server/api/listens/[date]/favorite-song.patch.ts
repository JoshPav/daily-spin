import { tz } from '@date-fns/tz';
import { startOfDay } from 'date-fns';
import type {
  UpdateFavoriteSong,
  UpdateFavoriteSongBody,
} from '#shared/schema';
import { DailyListenRepository } from '../../../repositories/dailyListen.repository';
import { SongOfDayPlaylistService } from '../../../services/songOfDayPlaylist.service';
import { handleError } from '../../../utils/errorHandler';
import { NotFoundError, ValidationError } from '../../../utils/errors';
import { createTaggedLogger } from '../../../utils/logger';
import { getLogContext } from '../../../utils/requestContext';
import { getSpotifyClientForUser } from '../../../utils/spotifyClient';

const logger = createTaggedLogger('API:favorite-song.patch');

export default defineEventHandler<
  { body: UpdateFavoriteSongBody },
  Promise<UpdateFavoriteSong['response']>
>(async (event) => {
  const dateParam = getRouterParam(event, 'date');
  const logContext = getLogContext(event);

  if (!dateParam) {
    throw handleError(
      new ValidationError('Missing date parameter'),
      logContext,
    );
  }

  // Parse and validate date
  const parsedDate = new Date(dateParam);
  if (Number.isNaN(parsedDate.getTime())) {
    throw handleError(new ValidationError('Invalid date format'), logContext);
  }

  const date = startOfDay(parsedDate, { in: tz('UTC') });

  const { userId } = event.context;
  const body = await readBody<UpdateFavoriteSongBody>(event);

  if (!body || typeof body !== 'object') {
    throw handleError(new ValidationError('Invalid request body'), logContext);
  }

  // Determine if clearing or setting favorite song
  const isClearing = body.spotifyId === null;
  const favoriteSong = isClearing
    ? null
    : 'name' in body && 'trackNumber' in body && 'albumId' in body
      ? {
          spotifyId: body.spotifyId,
          name: body.name,
          trackNumber: body.trackNumber,
          albumId: body.albumId,
        }
      : null;

  // Validate required fields when setting (not clearing)
  if (!isClearing && !favoriteSong) {
    throw handleError(
      new ValidationError(
        'Missing required fields: spotifyId, name, trackNumber, and albumId are required',
      ),
      logContext,
    );
  }

  logger.info('Updating favorite song for daily listen', {
    ...logContext,
    date: date.toISOString(),
    isClearing,
  });

  const repository = new DailyListenRepository();

  try {
    await repository.updateFavoriteSong(userId, date, favoriteSong);

    logger.info('Successfully updated favorite song', {
      ...logContext,
      date: date.toISOString(),
    });

    // Update Song of the Day playlist (don't block on failure)
    try {
      const { spotifyClient, spotifyUserId } =
        await getSpotifyClientForUser(userId);
      const playlistService = new SongOfDayPlaylistService();
      await playlistService.updateSongOfDayPlaylist(
        userId,
        spotifyUserId,
        spotifyClient,
      );
      logger.info('Successfully updated Song of the Day playlist', {
        ...logContext,
      });
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

    // Return the favoriteSong with Spotify album ID (from request body)
    // The database stores the internal album ID, but the API returns Spotify ID
    return {
      favoriteSong,
    };
  } catch (error) {
    // Handle Prisma P2025 (record not found)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2025'
    ) {
      throw handleError(
        new NotFoundError('Daily listen', { date: dateParam }),
        logContext,
      );
    }

    throw handleError(error, {
      ...logContext,
      date: dateParam,
    });
  }
});
