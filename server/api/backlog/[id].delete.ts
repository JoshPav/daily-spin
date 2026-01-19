import { BacklogService } from '~~/server/services/backlog.service';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { deleteBacklogItemSchema } from '~~/shared/schemas/backlog.schema';

export default createEventHandler(deleteBacklogItemSchema, async (event) => {
  const log = createContextLogger(event, 'API:backlog.delete');
  const { id } = event.validatedParams;
  const { userId } = event.context;
  const service = new BacklogService();

  log.info('Removing item from backlog', {
    backlogItemId: id,
  });

  await service.removeBacklogItem(userId, id);

  log.info('Successfully removed item from backlog', {
    backlogItemId: id,
  });

  setResponseStatus(event, 204);
  return null;
});
