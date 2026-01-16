import { tz } from '@date-fns/tz';
import { getHours, parseISO } from 'date-fns';
import type { ListenTime } from '#shared/schema';

type HourRange = { start: number; end: number };

const TIME_RANGES: Record<ListenTime, HourRange> = {
  morning: { start: 5, end: 12 },
  noon: { start: 12, end: 18 },
  evening: { start: 18, end: 22 },
  night: { start: 22, end: 5 },
};

const inHourRange =
  (hour: number) =>
  ({ start, end }: HourRange) =>
    hour >= start && hour < end;

export const getTrackListenTime = (playedAt: string): ListenTime => {
  // Spotify returns UTC timestamps, so we use UTC hours for classification
  const inRange = inHourRange(getHours(parseISO(playedAt), { in: tz('UTC') }));

  if (inRange(TIME_RANGES.morning)) {
    return 'morning';
  }

  if (inRange(TIME_RANGES.noon)) {
    return 'noon';
  }

  if (inRange(TIME_RANGES.evening)) {
    return 'evening';
  }

  return 'night';
};
