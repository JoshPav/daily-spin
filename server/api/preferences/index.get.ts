import type { GetPreferencesResponse } from '#shared/schema';
import { UserPreferencesService } from '~~/server/services/userPreferences.service';
import { createTaggedLogger } from '~~/server/utils/logger';
import { getLogContext } from '~~/server/utils/requestContext';

const logger = createTaggedLogger('API:preferences.get');

export default defineEventHandler<Promise<GetPreferencesResponse>>(
  async (event) => {
    const { userId } = event.context;
    const logContext = getLogContext(event);
    const preferencesService = new UserPreferencesService();

    logger.info('Fetching user preferences', logContext);

    const result = await preferencesService.getPreferences(userId);

    logger.info('Successfully fetched user preferences', {
      ...logContext,
      playlistCount: result.linkedPlaylists.length,
    });

    return result;
  },
);
