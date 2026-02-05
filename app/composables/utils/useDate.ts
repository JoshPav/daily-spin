import {
  isFuture as dfnsIsFuture,
  isToday as dfnsIsToday,
  format,
  getDate,
  getMonth,
  getYear,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns';
import { computed } from 'vue';

export const useDate = (dateString: string) => {
  const date = computed(() => parseISO(dateString));

  const day = computed(() => getDate(date.value));
  const month = computed(() => getMonth(date.value));
  const year = computed(() => getYear(date.value));

  const formattedMonth = computed(() =>
    format(date.value, 'MMM').toUpperCase(),
  );

  const isToday = () => dfnsIsToday(date.value);

  const isFuture = () => dfnsIsFuture(date.value);

  const isInLastWeek = () => {
    const today = startOfDay(new Date());
    const sevenDaysAgo = subDays(today, 6);
    const dateToCheck = startOfDay(date.value);
    return dateToCheck >= sevenDaysAgo && dateToCheck <= today;
  };

  return {
    date,
    day,
    month,
    year,
    formatted: {
      formattedMonth,
    },
    relative: {
      isFuture: computed(() => dfnsIsFuture(date.value)),
      isToday: computed(() => dfnsIsToday(date.value)),
      isInLastWeek: computed(() => isInLastWeek()),
    },
    utils: {
      isFuture,
      isToday,
      isInLastWeek,
    },
  };
};
