import { FutureListenService } from '~~/server/services/futureListen.service';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { getFutureListensSchema } from '~~/shared/schemas/futureListen.schema';

export default createEventHandler(getFutureListensSchema, async (event) => {
  const log = createContextLogger(event, 'API:future-listens.get');
  const { userId } = event.context;
  const service = new FutureListenService();

  log.info('Fetching future listens');

  const items = await service.getFutureListens(userId);

  log.info('Successfully fetched future listens', {
    itemCount: items.length,
  });

  return { items };
});
