import { computed, ref } from 'vue';
import type { DailyListens } from '#shared/schema';

const dailyListens = ref<DailyListens | null>(null);

type OpenModalPayload = {
  dailyListens: DailyListens;
};

export const useDailyListensModal = () => {
  const open = (payload: OpenModalPayload) => {
    dailyListens.value = payload.dailyListens;
  };

  const isOpen = computed(() => !!dailyListens.value);

  const close = () => {
    dailyListens.value = null;
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
