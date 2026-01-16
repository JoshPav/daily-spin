import type { GetFutureListensResponse } from '#shared/schema';
import { FutureListenService } from '../../services/futureListen.service';
import { createTaggedLogger } from '../../utils/logger';
import { getLogContext } from '../../utils/requestContext';

const logger = createTaggedLogger('API:future-listens.get');

export default defineEventHandler<Promise<GetFutureListensResponse>>(
  async (event) => {
    const { userId } = event.context;
    const logContext = getLogContext(event);
    const service = new FutureListenService();

    logger.info('Fetching future listens', logContext);

    const items = await service.getFutureListens(userId);

    logger.info('Successfully fetched future listens', {
      ...logContext,
      itemCount: items.length,
    });

    return { items };
  },
);
