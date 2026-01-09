import { computed } from 'vue';

/**
 * Pure utility composable for working with dates
 * Provides basic date information and comparison utilities
 */
export const useDate = (dateString: string) => {
  const date = computed(() => new Date(dateString));

  const dayOfMonth = computed(() => date.value.getDate());
  const month = computed(() => date.value.getMonth());
  const year = computed(() => date.value.getFullYear());

  const formattedMonth = computed(() => {
    return date.value
      .toLocaleDateString('en-US', { month: 'short' })
      .toUpperCase();
  });

  const isToday = computed(() => {
    const today = new Date();
    const listen = date.value;
    return (
      today.getDate() === listen.getDate() &&
      today.getMonth() === listen.getMonth() &&
      today.getFullYear() === listen.getFullYear()
    );
  });

  const isFuture = computed(() => {
    const today = new Date();
    const listen = date.value;

    // Reset time to midnight for accurate date comparison
    today.setHours(0, 0, 0, 0);
    const listenDate = new Date(listen);
    listenDate.setHours(0, 0, 0, 0);

    return listenDate > today;
  });

  return {
    date,
    dayOfMonth,
    month,
    year,
    formattedMonth,
    isToday,
    isFuture,
  };
};
