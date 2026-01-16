import {
  isFuture as dfnsIsFuture,
  isToday as dfnsIsToday,
  format,
  getDate,
  getMonth,
  getYear,
  parseISO,
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

  return {
    date,
    day,
    month,
    year,
    formatted: {
      formattedMonth,
    },
    utils: {
      isFuture,
      isToday,
    },
  };
};
