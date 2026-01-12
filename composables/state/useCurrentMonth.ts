import { computed, ref } from 'vue';

// Shared state for the currently visible month
const currentMonth = ref<Date>(new Date());

export const useCurrentMonth = () => {
  const setCurrentMonth = (date: Date) => {
    currentMonth.value = date;
  };

  const formattedMonth = computed(() =>
    currentMonth.value.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
  );

  return {
    formattedMonth,
    setCurrentMonth,
  };
};
