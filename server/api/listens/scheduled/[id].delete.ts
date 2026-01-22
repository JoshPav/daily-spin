import { ScheduledListenService } from '~~/server/services/scheduledListen.service';
import { NotFoundError } from '~~/server/utils/errors';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { deleteScheduledListenSchema } from '~~/shared/schemas/scheduledListen.schema';

export default createEventHandler(
  deleteScheduledListenSchema,
  async (event) => {
    const log = createContextLogger(event, 'API:listens/scheduled.delete');
    const { userId } = event.context;
    const { id } = event.validatedParams;
    const service = new ScheduledListenService();

    log.info('Removing scheduled listen', {
      scheduledListenId: id,
    });

    try {
      await service.removeScheduledListen(userId, id);

      log.info('Successfully removed scheduled listen', {
        scheduledListenId: id,
      });
    } catch (_error) {
      throw new NotFoundError('Scheduled listen', { id });
    }
  },
);
