import { endOfDay, isValid, startOfDay, subDays } from 'date-fns';
import type { GetListensQueryParams, GetListensResponse } from '#shared/schema';
import { DailyListenService } from '../services/dailyListen.service';
import { createTaggedLogger } from '../utils/logger';
import { getLogContext } from '../utils/requestContext';

const logger = createTaggedLogger('API:listens.get');

export default defineEventHandler<Promise<GetListensResponse>>(
  async (event) => {
    const query = getQuery<GetListensQueryParams>(event);
    const { userId } = event.context;
    const logContext = getLogContext(event);

    // Default to last 2 weeks if no range specified
    const today = new Date();
    const defaultEnd = endOfDay(today);
    const defaultStart = startOfDay(subDays(today, 14));

    const startDate = query.startDate
      ? new Date(query.startDate)
      : defaultStart;
    const endDate = query.endDate ? new Date(query.endDate) : defaultEnd;

    logger.info('Fetching listening history', {
      ...logContext,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    if (!isValid(startDate) || !isValid(endDate)) {
      logger.error('Invalid date format provided', {
        ...logContext,
        startDateParam: query.startDate,
        endDateParam: query.endDate,
      });
      throw createError({
        statusCode: 400,
        message: 'Invalid date format',
      });
    }

    if (startDate > endDate) {
      logger.error('Invalid date range: startDate after endDate', {
        ...logContext,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      throw createError({
        statusCode: 400,
        message: 'startDate must be before endDate',
      });
    }

    const result = await new DailyListenService().getListensInRange(userId, {
      start: startDate,
      end: endDate,
    });

    logger.info('Successfully fetched listening history', {
      ...logContext,
      resultCount: result.length,
    });

    return result;
  },
);
