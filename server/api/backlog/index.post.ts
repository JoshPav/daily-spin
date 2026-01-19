import { BacklogService } from '~~/server/services/backlog.service';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { addBacklogItemsSchema } from '~~/shared/schemas/backlog.schema';

export default createEventHandler(addBacklogItemsSchema, async (event) => {
  const log = createContextLogger(event, 'API:backlog.post');
  const service = new BacklogService();
  const { userId } = event.context;
  const body = event.validatedBody;

  log.info('Adding items to backlog', {
    itemCount: body.length,
  });

  const result = await service.addBacklogItems(userId, body);

  log.info('Successfully added items to backlog', {
    addedCount: result.added.length,
    skippedCount: result.skipped.length,
  });

  return result;
});
