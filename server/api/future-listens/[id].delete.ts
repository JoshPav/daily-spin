import { FutureListenService } from '../../services/futureListen.service';
import { createTaggedLogger } from '../../utils/logger';
import { getLogContext } from '../../utils/requestContext';

const logger = createTaggedLogger('API:future-listens.delete');

export default defineEventHandler(async (event): Promise<void> => {
  const { userId } = event.context;
  const logContext = getLogContext(event);
  const id = getRouterParam(event, 'id');

  if (!id) {
    logger.error('Missing future listen ID', logContext);
    throw createError({
      statusCode: 400,
      message: 'Missing future listen ID',
    });
  }

  const service = new FutureListenService();

  logger.info('Removing future listen', {
    ...logContext,
    futureListenId: id,
  });

  try {
    await service.removeFutureListen(userId, id);

    logger.info('Successfully removed future listen', {
      ...logContext,
      futureListenId: id,
    });
  } catch (error) {
    logger.error('Failed to remove future listen', {
      ...logContext,
      futureListenId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw createError({
      statusCode: 404,
      message: 'Future listen not found',
    });
  }
});
