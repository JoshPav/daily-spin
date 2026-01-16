import { BacklogService } from '../../services/backlog.service';
import { createTaggedLogger } from '../../utils/logger';
import { getLogContext } from '../../utils/requestContext';

const logger = createTaggedLogger('API:backlog.delete');

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const logContext = getLogContext(event);

  if (!id) {
    logger.error('Missing id parameter', logContext);
    throw createError({
      statusCode: 400,
      message: 'Missing id parameter',
    });
  }

  const { userId } = event.context;
  const service = new BacklogService();

  logger.info('Removing item from backlog', {
    ...logContext,
    backlogItemId: id,
  });

  try {
    await service.removeBacklogItem(userId, id);

    logger.info('Successfully removed item from backlog', {
      ...logContext,
      backlogItemId: id,
    });
  } catch (error) {
    logger.error('Failed to remove item from backlog', {
      ...logContext,
      backlogItemId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw createError({
      statusCode: 404,
      message: 'Backlog item not found',
    });
  }

  setResponseStatus(event, 204);
  return null;
});
