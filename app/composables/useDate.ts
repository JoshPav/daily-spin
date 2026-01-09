import { computed, ref } from 'vue';

// Shared state to track which months we've seen
const seenMonths = ref<Set<string>>(new Set());

// Reset function to clear the state (useful when data refreshes)
export const resetSeenMonths = () => {
  seenMonths.value = new Set();
};

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

  // Check if this is the first occurrence of this month
  const monthKey = computed(
    () => `${date.value.getFullYear()}-${date.value.getMonth()}`,
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
    return date.value.getMonth() === 0; // January
  });

  const monthYearDisplay = computed(() => {
    return isNewYear.value
      ? `${formattedMonth.value} ${year.value}`
      : formattedMonth.value;
  });

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
