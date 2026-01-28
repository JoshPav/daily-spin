import { onMounted, onUnmounted, type Ref, watch } from 'vue';

/**
 * Sets up intersection observer tracking to update the sticky month header
 * as album day cards scroll into view.
 *
 * @param cardRef - Ref to the component exposing cardEl
 * @param date - The Date object for this card
 */
export const useMonthHeaderTracking = (
  cardRef: Ref<{ cardEl: HTMLElement | null } | null>,
  date: Ref<Date>,
): void => {
  const { setCurrentMonth } = useCurrentMonth();

  onMounted(() => {
    watch(
      () => cardRef.value?.cardEl,
      (el) => {
        if (!el) return;

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
                setCurrentMonth(date.value);
              }
            });
          },
          {
            threshold: [0.3, 0.5, 0.7],
            rootMargin: '-40% 0px -40% 0px',
          },
        );

        observer.observe(el);

        onUnmounted(() => {
          observer.unobserve(el);
        });
      },
      { immediate: true },
    );
  });
};
