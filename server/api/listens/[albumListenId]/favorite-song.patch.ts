import type {
  UpdateFavoriteSong,
  UpdateFavoriteSongBody,
} from '#shared/schema';
import { DailyListenRepository } from '../../../repositories/dailyListen.repository';
import { handleError } from '../../../utils/errorHandler';
import { NotFoundError, ValidationError } from '../../../utils/errors';
import { createTaggedLogger } from '../../../utils/logger';
import { getLogContext } from '../../../utils/requestContext';

const logger = createTaggedLogger('API:favorite-song.patch');

export default defineEventHandler<
  { body: UpdateFavoriteSongBody },
  Promise<UpdateFavoriteSong['response']>
>(async (event) => {
  const albumListenId = getRouterParam(event, 'albumListenId');
  const logContext = getLogContext(event);

  if (!albumListenId) {
    throw handleError(
      new ValidationError('Missing albumListenId parameter'),
      logContext,
    );
  }

  const { userId } = event.context;
  const body = await readBody<UpdateFavoriteSongBody>(event);

  if (!body || typeof body !== 'object') {
    throw handleError(new ValidationError('Invalid request body'), logContext);
  }

  // Determine if clearing or setting favorite song
  const isClearing = body.spotifyId === null;
  const favoriteSong = isClearing
    ? null
    : 'name' in body && 'trackNumber' in body
      ? {
          spotifyId: body.spotifyId,
          name: body.name,
          trackNumber: body.trackNumber,
        }
      : null;

  // Validate required fields when setting (not clearing)
  if (!isClearing && !favoriteSong) {
    throw handleError(
      new ValidationError(
        'Missing required fields: spotifyId, name, and trackNumber are required',
      ),
      logContext,
    );
  }

  logger.info('Updating favorite song for album listen', {
    ...logContext,
    albumListenId,
    isClearing,
  });

  const repository = new DailyListenRepository();

  try {
    const result = await repository.updateFavoriteSong(
      userId,
      albumListenId,
      favoriteSong,
    );

    logger.info('Successfully updated favorite song', {
      ...logContext,
      albumListenId,
    });

    return {
      favoriteSong:
        result.favoriteSongId &&
        result.favoriteSongName &&
        result.favoriteSongTrackNumber
          ? {
              spotifyId: result.favoriteSongId,
              name: result.favoriteSongName,
              trackNumber: result.favoriteSongTrackNumber,
            }
          : null,
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
        new NotFoundError('Album listen', { albumListenId }),
        logContext,
      );
    }

    throw handleError(error, {
      ...logContext,
      albumListenId,
    });
  }
});
