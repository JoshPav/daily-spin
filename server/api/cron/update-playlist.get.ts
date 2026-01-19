import { updateTodaysAlbumPlaylist } from '~~/server/tasks/updateTodaysAlbumPlaylist';
import { handleError } from '~~/server/utils/errorHandler';
import { createTaggedLogger } from '~~/server/utils/logger';

const logger = createTaggedLogger('Cron:UpdatePlaylist');

export default defineEventHandler(async () => {
  try {
    logger.info('CRON job triggered: updateTodaysAlbumPlaylist');
    const result = await updateTodaysAlbumPlaylist();
    logger.info('CRON job completed: updateTodaysAlbumPlaylist', {
      result: result.result,
    });

    return { success: true, ...result };
  } catch (error) {
    throw handleError(error, { endpoint: '/api/cron/update-playlist' });
  }
});
