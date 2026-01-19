import { scheduleBacklogListens } from '~~/server/tasks/scheduleBacklogListens';
import { handleError } from '~~/server/utils/errorHandler';
import { createTaggedLogger } from '~~/server/utils/logger';

const logger = createTaggedLogger('Cron:ScheduleBacklog');

export default defineEventHandler(async () => {
  try {
    logger.info('CRON job triggered: scheduleBacklogListens');
    const result = await scheduleBacklogListens();
    logger.info('CRON job completed: scheduleBacklogListens', {
      result: result.result,
    });

    return { success: true, ...result };
  } catch (error) {
    throw handleError(error, { endpoint: '/api/cron/schedule-backlog' });
  }
});
