import { ref } from 'vue';

// Shared state for the currently visible month
const currentMonth = ref<string>('');

export const useCurrentMonth = () => {
  const setCurrentMonth = (monthYearDisplay: string) => {
    currentMonth.value = monthYearDisplay;
  };

  return {
    currentMonth,
    setCurrentMonth,
  };
};
