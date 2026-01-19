import { FutureListenService } from '~~/server/services/futureListen.service';
import { NotFoundError } from '~~/server/utils/errors';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { deleteFutureListenSchema } from '~~/shared/schemas/futureListen.schema';

export default createEventHandler(deleteFutureListenSchema, async (event) => {
  const log = createContextLogger(event, 'API:future-listens.delete');
  const { userId } = event.context;
  const { id } = event.validatedParams;
  const service = new FutureListenService();

  log.info('Removing future listen', {
    futureListenId: id,
  });

  try {
    await service.removeFutureListen(userId, id);

    log.info('Successfully removed future listen', {
      futureListenId: id,
    });
  } catch (_error) {
    throw new NotFoundError('Future listen', { id });
  }
});
