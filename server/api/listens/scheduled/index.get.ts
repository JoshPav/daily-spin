import { addDays, startOfDay } from 'date-fns';
import { ScheduledListenService } from '~~/server/services/scheduledListen.service';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { getScheduledListensSchema } from '~~/shared/schemas/scheduledListen.schema';

const DEFAULT_DAYS_AHEAD = 7;

export default createEventHandler(getScheduledListensSchema, async (event) => {
  const log = createContextLogger(event, 'API:listens/scheduled.get');
  const { userId } = event.context;
  const { startDate, endDate } = event.validatedQuery;

  const service = new ScheduledListenService();

  // Apply defaults: today to today + 7 days
  const today = startOfDay(new Date());
  const effectiveStartDate = startDate ?? today;
  const effectiveEndDate = endDate ?? addDays(today, DEFAULT_DAYS_AHEAD);

  log.info('Fetching scheduled listens', {
    startDate: effectiveStartDate.toISOString(),
    endDate: effectiveEndDate.toISOString(),
  });

  const result = await service.getScheduledListensPaginated(
    userId,
    effectiveStartDate,
    effectiveEndDate,
  );

  log.info('Successfully fetched scheduled listens', {
    total: result.pagination.total,
    hasMore: result.pagination.hasMore,
  });

  return result;
});
