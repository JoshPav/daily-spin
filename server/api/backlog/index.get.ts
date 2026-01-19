import { BacklogService } from '~~/server/services/backlog.service';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { getBacklogSchema } from '~~/shared/schemas/backlog.schema';

export default createEventHandler(getBacklogSchema, async (event) => {
  const log = createContextLogger(event, 'API:backlog.get');
  const { userId } = event.context;
  const backlogService = new BacklogService();

  log.info('Fetching backlog');

  const albums = await backlogService.getBacklog(userId);

  log.info('Successfully fetched backlog', {
    albumCount: albums.length,
  });

  return { albums };
});
