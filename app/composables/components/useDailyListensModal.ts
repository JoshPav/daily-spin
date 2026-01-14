import type { DailyListens } from '#shared/schema';
import { LazyDailyListensModal } from '#components';

type OpenModalPayload = {
  dailyListens: DailyListens;
};

export const useDailyListensModal = () => {
  const overlay = useOverlay();
  const modal = overlay.create(LazyDailyListensModal);

  const open = ({ dailyListens }: OpenModalPayload) => {
    modal.open({
      dailyListens: dailyListens,
    });
  };

  return {
    open,
  };
};
