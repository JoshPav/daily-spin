import { UserPreferencesService } from '~~/server/services/userPreferences.service';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { updatePreferencesSchema } from '~~/shared/schemas/preferences.schema';

export default createEventHandler(updatePreferencesSchema, async (event) => {
  const log = createContextLogger(event, 'API:preferences.patch');
  const { userId } = event.context;
  const body = event.validatedBody;
  const preferencesService = new UserPreferencesService();

  log.info('Updating user preferences', {
    updatedFields: Object.keys(body),
  });

  const result = await preferencesService.updatePreferences(userId, body);

  log.info('Successfully updated user preferences', {
    updatedFields: Object.keys(body),
  });

  return result;
});
