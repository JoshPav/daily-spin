import { computed, ref } from 'vue';

// Shared state to track which months we've seen
const seenMonths = ref<Set<string>>(new Set());

// Reset function to clear the state (useful when data refreshes)
export const resetSeenMonths = () => {
  seenMonths.value = new Set();
};

export const useDate = (dateString: string) => {
  const listenDate = computed(() => new Date(dateString));

  const dayOfMonth = computed(() => listenDate.value.getDate());

  const year = computed(() => listenDate.value.getFullYear());

  const monthName = computed(() => {
    return listenDate.value
      .toLocaleDateString('en-US', { month: 'short' })
      .toUpperCase();
  });

  const isToday = computed(() => {
    const today = new Date();
    const listen = listenDate.value;
    return (
      today.getDate() === listen.getDate() &&
      today.getMonth() === listen.getMonth() &&
      today.getFullYear() === listen.getFullYear()
    );
  });

  const isFuture = computed(() => {
    const today = new Date().toISOString();
    const listen = listenDate.value.toISOString();

    return listen > today;
  });

  // Check if this is the first occurrence of this month
  const monthKey = computed(
    () => `${listenDate.value.getFullYear()}-${listenDate.value.getMonth()}`,
  );

  const showMonthBanner = computed(() => {
    const key = monthKey.value;
    const isFirst = !seenMonths.value.has(key);

    if (isFirst) {
      seenMonths.value.add(key);
    }

    return isFirst;
  });

  const isNewYear = computed(() => {
    return listenDate.value.getMonth() === 0; // January
  });

  const monthYearDisplay = computed(() => {
    return isNewYear.value
      ? `${monthName.value} ${year.value}`
      : monthName.value;
  });

  return {
    listenDate,
    dayOfMonth,
    monthName,
    year,
    isToday,
    showMonthBanner,
    isNewYear,
    monthYearDisplay,
    isFuture,
  };
};
