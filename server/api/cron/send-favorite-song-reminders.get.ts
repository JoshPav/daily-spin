import { sendFavoriteSongReminders } from '~~/server/tasks/sendFavoriteSongReminders';
import { handleError } from '~~/server/utils/errorHandler';
import { createTaggedLogger } from '~~/server/utils/logger';

const logger = createTaggedLogger('Cron:SendFavoriteSongReminders');

export default defineEventHandler(async () => {
  try {
    logger.info('CRON job triggered: sendFavoriteSongReminders');
    const result = await sendFavoriteSongReminders();
    logger.info('CRON job completed: sendFavoriteSongReminders', {
      result: result.result,
    });

    return { success: true, ...result };
  } catch (error) {
    throw handleError(error, {
      endpoint: '/api/cron/send-favorite-song-reminders',
    });
  }
});
