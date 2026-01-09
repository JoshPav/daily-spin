import { ref } from 'vue';
import type { DailyListens } from '#shared/schema';

const isOpen = ref(false);
const dailyListens = ref<DailyListens | null>(null);

type OpenModalPayload = {
  dailyListens: DailyListens;
};

export const useDailyListensModal = () => {
  const open = (payload: OpenModalPayload) => {
    dailyListens.value = payload.dailyListens;
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
    setTimeout(() => {
      dailyListens.value = null;
    }, 300);
  };

  const viewTransitionName = computed(() => {
    if (!dailyListens.value) return null;
    return `date-${dailyListens.value.date}`;
  });

  return {
    isOpen,
    dailyListens,
    open,
    close,
    viewTransitionName,
  };
};
