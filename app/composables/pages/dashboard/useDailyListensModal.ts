import { LazyDailyListensModal } from '#components';
import type { DailyListens } from '#shared/schema';

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
