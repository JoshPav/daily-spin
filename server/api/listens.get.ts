import type { GetListensQueryParams, GetListensResponse } from '#shared/schema';
import { DailyListenService } from '../services/dailyListen.service';

export default defineEventHandler<Promise<GetListensResponse>>(
  async (event) => {
    const query = getQuery<GetListensQueryParams>(event);
    const { userId } = event.context;

    // Default to last 2 weeks if no range specified
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14);
    twoWeeksAgo.setHours(0, 0, 0, 0);

    const startDate = query.startDate ? new Date(query.startDate) : twoWeeksAgo;
    const endDate = query.endDate ? new Date(query.endDate) : today;

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw createError({
        statusCode: 400,
        message: 'Invalid date format',
      });
    }

    if (startDate > endDate) {
      throw createError({
        statusCode: 400,
        message: 'startDate must be before endDate',
      });
    }

    return new DailyListenService().getListensInRange(userId, {
      start: startDate,
      end: endDate,
    });
  },
);
