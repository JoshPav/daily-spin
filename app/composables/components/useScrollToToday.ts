import { nextTick, onMounted, type Ref, ref } from 'vue';

export interface UseScrollToTodayOptions {
  isReady: Ref<boolean>;
}

export const useScrollToToday = ({ isReady }: UseScrollToTodayOptions) => {
  const scrollContainer = ref<HTMLElement | null>(null);
  const todayElement = ref<HTMLElement | null>(null);

  const scrollToToday = () => {
    const container = scrollContainer.value;
    const item = todayElement.value;

    if (!container || !item) {
      return;
    }

    const containerStyle = window.getComputedStyle(container);
    const isScrollable =
      containerStyle.overflowY === 'auto' ||
      containerStyle.overflowY === 'scroll';

    if (!isScrollable) {
      console.warn(
        'scrollContainer ref is not on a scrollable element. ' +
          'Ensure the ref is placed on the element with overflow-y: auto/scroll.',
      );
      return;
    }

    const top = item.offsetTop - container.offsetTop;
    container.scrollTo({
      top: top - container.offsetHeight / 2 + item.offsetHeight / 2,
      behavior: 'smooth',
    });
  };

  onMounted(async () => {
    if (isReady.value) {
      await nextTick();
      scrollToToday();
    }
  });

  return {
    scrollContainer,
    todayElement,
    scrollToToday,
  };
};
