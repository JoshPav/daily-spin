import {
  isToday as dfnsIsToday,
  endOfDay,
  format,
  isSameDay,
  isWithinInterval,
  startOfDay,
} from 'date-fns';

export const getStartOfDayTimestamp = (date = new Date()) =>
  Math.floor(startOfDay(date).getTime() / 1000);

export const getEndOfDayTimestamp = (date = new Date()) =>
  Math.floor(endOfDay(date).getTime() / 1000);

export const isPlayedToday = (playedAt: string, targetDate = new Date()) =>
  isSameDay(new Date(playedAt), targetDate);

export const isToday = (date: Date): boolean => dfnsIsToday(date);

export const dateInRange = (
  date: Date,
  { start, end }: { start: Date; end: Date },
) => isWithinInterval(date, { start, end });

/** Formats a Date to YYYY-MM-DD string for API responses */
export const toDateString = (date: Date): string => format(date, 'yyyy-MM-dd');
