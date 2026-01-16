import { BacklogService } from '../../services/backlog.service';
import { handleError } from '../../utils/errorHandler';
import { ValidationError } from '../../utils/errors';
import { createTaggedLogger } from '../../utils/logger';
import { getLogContext } from '../../utils/requestContext';

const logger = createTaggedLogger('API:backlog.delete');

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const logContext = getLogContext(event);

  if (!id) {
    throw handleError(new ValidationError('Missing id parameter'), logContext);
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

    setResponseStatus(event, 204);
    return null;
  } catch (error) {
    throw handleError(error, {
      ...logContext,
      backlogItemId: id,
    });
  }
});
