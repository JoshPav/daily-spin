import { endOfDay, startOfDay, subDays } from 'date-fns';
import { DailyListenService } from '~~/server/services/dailyListen.service';
import { ValidationError } from '~~/server/utils/errors';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { getListensSchema } from '~~/shared/schemas/listens.schema';

export default createEventHandler(getListensSchema, async (event) => {
  const log = createContextLogger(event, 'API:listens.get');
  const query = event.validatedQuery;
  const { userId } = event.context;

  // Default to last 2 weeks if no range specified
  const today = new Date();
  const startDate = query?.startDate ?? startOfDay(subDays(today, 14));
  const endDate = query?.endDate ?? endOfDay(today);

  log.info('Fetching listening history', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  if (startDate > endDate) {
    throw new ValidationError('startDate must be before endDate', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  }

  const result = await new DailyListenService().getListensInRange(userId, {
    start: startDate,
    end: endDate,
  });

  log.info('Successfully fetched listening history', {
    resultCount: result.length,
  });

  return result;
});
