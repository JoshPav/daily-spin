import { UserPreferencesService } from '~~/server/services/userPreferences.service';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { getPreferencesSchema } from '~~/shared/schemas/preferences.schema';

export default createEventHandler(getPreferencesSchema, async (event) => {
  const log = createContextLogger(event, 'API:preferences.get');
  const { userId } = event.context;
  const preferencesService = new UserPreferencesService();

  log.info('Fetching user preferences');

  const result = await preferencesService.getPreferences(userId);

  log.info('Successfully fetched user preferences', {
    playlistCount: result.linkedPlaylists.length,
  });

  return result;
});
