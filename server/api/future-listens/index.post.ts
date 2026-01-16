import type { AddFutureListenBody, FutureListenItem } from '#shared/schema';
import { FutureListenService } from '../../services/futureListen.service';
import { createTaggedLogger } from '../../utils/logger';
import { getLogContext } from '../../utils/requestContext';

const logger = createTaggedLogger('API:future-listens.post');

export default defineEventHandler(async (event): Promise<FutureListenItem> => {
  const { userId } = event.context;
  const logContext = getLogContext(event);
  const service = new FutureListenService();

  const body = await readBody<AddFutureListenBody>(event);

  logger.info('Adding future listen', {
    ...logContext,
    albumSpotifyId: body.spotifyId,
    scheduledDate: body.date,
  });

  try {
    const result = await service.addFutureListen(userId, body);

    logger.info('Successfully added future listen', {
      ...logContext,
      futureListenId: result.id,
      albumSpotifyId: body.spotifyId,
    });

    return result;
  } catch (error) {
    logger.error('Failed to add future listen', {
      ...logContext,
      albumSpotifyId: body.spotifyId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
});
