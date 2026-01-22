import { addDays, startOfDay } from 'date-fns';
import { FutureListenService } from '~~/server/services/futureListen.service';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { getFutureListensSchema } from '~~/shared/schemas/futureListen.schema';

const DEFAULT_DAYS_AHEAD = 7;

export default createEventHandler(getFutureListensSchema, async (event) => {
  const log = createContextLogger(event, 'API:future-listens.get');
  const { userId } = event.context;
  const { startDate, endDate } = event.validatedQuery;

  const service = new FutureListenService();

  // Apply defaults: today to today + 7 days
  const today = startOfDay(new Date());
  const effectiveStartDate = startDate ?? today;
  const effectiveEndDate = endDate ?? addDays(today, DEFAULT_DAYS_AHEAD);

  log.info('Fetching future listens', {
    startDate: effectiveStartDate.toISOString(),
    endDate: effectiveEndDate.toISOString(),
  });

  const result = await service.getFutureListensPaginated(
    userId,
    effectiveStartDate,
    effectiveEndDate,
  );

  log.info('Successfully fetched future listens', {
    total: result.pagination.total,
    hasMore: result.pagination.hasMore,
  });

  return result;
});
