import type {
  AddBacklogItemsBody,
  AddBacklogItemsResponse,
} from '~~/shared/schema';
import { BacklogService } from '../../services/backlog.service';
import { createTaggedLogger } from '../../utils/logger';
import { getLogContext } from '../../utils/requestContext';

const logger = createTaggedLogger('API:backlog.post');

export default defineEventHandler(
  async (event): Promise<AddBacklogItemsResponse> => {
    const service = new BacklogService();
    const userId = event.context.userId;
    const logContext = getLogContext(event);

    const body = await readBody<AddBacklogItemsBody>(event);

    logger.info('Adding items to backlog', {
      ...logContext,
      itemCount: body.length,
    });

    try {
      const result = await service.addBacklogItems(userId, body);

      logger.info('Successfully added items to backlog', {
        ...logContext,
        addedCount: result.added.length,
        skippedCount: result.skipped.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to add items to backlog', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
);
