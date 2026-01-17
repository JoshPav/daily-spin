import type {
  GetPreferencesResponse,
  UpdatePreferencesBody,
} from '#shared/schema';
import { UserPreferencesService } from '../services/userPreferences.service';
import { handleError } from '../utils/errorHandler';
import { createTaggedLogger } from '../utils/logger';
import { getLogContext } from '../utils/requestContext';

const logger = createTaggedLogger('API:preferences.patch');

export default defineEventHandler<Promise<GetPreferencesResponse>>(
  async (event) => {
    const { userId } = event.context;
    const logContext = getLogContext(event);
    const preferencesService = new UserPreferencesService();

    const body = await readBody<UpdatePreferencesBody>(event);

    logger.info('Updating user preferences', {
      ...logContext,
      updatedFields: Object.keys(body),
    });

    try {
      const result = await preferencesService.updatePreferences(userId, body);

      logger.info('Successfully updated user preferences', {
        ...logContext,
        updatedFields: Object.keys(body),
      });

      return result;
    } catch (error) {
      throw handleError(error, logContext);
    }
  },
);
