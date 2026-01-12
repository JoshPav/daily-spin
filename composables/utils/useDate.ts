import { computed } from 'vue';

export const useDate = (dateString: string) => {
  const date = computed(() => new Date(dateString));

  const day = computed(() => date.value.getDate());
  const month = computed(() => date.value.getMonth());
  const year = computed(() => date.value.getFullYear());

  const formattedMonth = computed(() => {
    return date.value
      .toLocaleDateString('en-US', { month: 'short' })
      .toUpperCase();
  });

  const isToday = () => {
    const today = new Date();
    const listen = date.value;
    return (
      today.getDate() === listen.getDate() &&
      today.getMonth() === listen.getMonth() &&
      today.getFullYear() === listen.getFullYear()
    );
  };

  const isFuture = () => {
    const today = new Date().toISOString();
    const listen = date.value.toISOString();

    return listen > today;
  };

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
