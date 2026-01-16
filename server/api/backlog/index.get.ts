import type { GetBacklogResponse } from '#shared/schema';
import { BacklogService } from '../../services/backlog.service';
import { createTaggedLogger } from '../../utils/logger';
import { getLogContext } from '../../utils/requestContext';

const logger = createTaggedLogger('API:backlog.get');

export default defineEventHandler<Promise<GetBacklogResponse>>(
  async (event) => {
    const { userId } = event.context;
    const logContext = getLogContext(event);
    const backlogService = new BacklogService();

    logger.info('Fetching backlog', logContext);

    const albums = await backlogService.getBacklog(userId);

    logger.info('Successfully fetched backlog', {
      ...logContext,
      albumCount: albums.length,
    });

    return { albums };
  },
);
