export const getStartOfDayTimestamp = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return Math.floor(start.getTime() / 1000);
};

export const getEndOfDayTimestamp = (date = new Date()) => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return Math.floor(end.getTime() / 1000);
};

export const isPlayedToday = (playedAt: string, targetDate = new Date()) => {
  const playedDate = new Date(playedAt);
  const startOfDay = getStartOfDayTimestamp(targetDate);
  const endOfDay = getEndOfDayTimestamp(targetDate);
  const playedTimestamp = Math.floor(playedDate.getTime() / 1000);

  return playedTimestamp >= startOfDay && playedTimestamp <= endOfDay;
};

export const isToday = (date: Date): boolean => {
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

export const dateInRange = (
  date: Date,
  { start, end }: { start: Date; end: Date },
) => start.getTime() <= date.getTime() && date.getTime() <= end.getTime();
