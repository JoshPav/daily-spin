import { processListens } from '~~/server/tasks/processListens';
import { verifyCronAuth } from '~~/server/utils/cron';
import { handleError } from '~~/server/utils/errorHandler';
import { createTaggedLogger } from '~~/server/utils/logger';

const logger = createTaggedLogger('Cron:ProcessListens');

export default defineEventHandler(async (event) => {
  try {
    verifyCronAuth(event);

    logger.info('CRON job triggered: processListens');
    const result = await processListens();
    logger.info('CRON job completed: processListens', {
      result: result.result,
    });

    return { success: true, ...result };
  } catch (error) {
    throw handleError(error, { endpoint: '/api/cron/process-listens' });
  }
});
