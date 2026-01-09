import { computed, ref } from 'vue';

// Shared state to track which months we've seen
const seenMonths = ref<Set<string>>(new Set());

// Reset function to clear the state (useful when data refreshes)
export const resetSeenMonths = () => {
  seenMonths.value = new Set();
};

export const useMonthBanner = (dateString: string) => {
  const date = computed(() => new Date(dateString));

  const monthKey = computed(
    () => `${date.value.getFullYear()}-${date.value.getMonth()}`,
  );

  const showMonthBanner = computed(() => {
    const key = monthKey.value;
    const isFirst = !seenMonths.value.has(key);

    if (isFirst) {
      // Create a new Set to trigger reactivity
      seenMonths.value = new Set(seenMonths.value).add(key);
    }

    return isFirst;
  });

  const monthName = computed(() => {
    return date.value.toLocaleDateString('en-US', { month: 'long' });
  });

  const monthNameShort = computed(() => {
    return date.value.toLocaleDateString('en-US', { month: 'short' });
  });

  const year = computed(() => date.value.getFullYear());

  const monthYearDisplay = computed(() => {
    return `${monthName.value} ${year.value}`;
  });

  const monthYearDisplayShort = computed(() => {
    return `${monthNameShort.value} ${year.value}`;
  });

  return {
    showMonthBanner,
    monthYearDisplay,
    monthYearDisplayShort,
    monthNameShort,
  };
};
