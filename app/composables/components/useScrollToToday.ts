import {
  type ComponentPublicInstance,
  nextTick,
  onMounted,
  type Ref,
  ref,
  watch,
} from 'vue';

export interface UseScrollToTodayOptions {
  isReady: Ref<boolean>;
  /** Optional ref to a UScrollArea component - if provided, uses its viewport for scrolling */
  scrollAreaRef?: Ref<ComponentPublicInstance | null>;
}

export const useScrollToToday = ({
  isReady,
  scrollAreaRef,
}: UseScrollToTodayOptions) => {
  const scrollContainer = ref<HTMLElement | null>(null);
  const todayElement = ref<HTMLElement | null>(null);

  // Get the actual scrollable element (either direct ref or ScrollArea's viewport)
  const getScrollableElement = (): HTMLElement | null => {
    if (scrollAreaRef?.value) {
      // UScrollArea: the viewport is the scrollable element inside $el
      const el = scrollAreaRef.value.$el as HTMLElement;
      return el?.querySelector(
        '[data-radix-scroll-area-viewport]',
      ) as HTMLElement | null;
    }
    return scrollContainer.value;
  };

  const scrollToToday = () => {
    const container = getScrollableElement();
    const item = todayElement.value;

    if (!container || !item) {
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

  watch(isReady, (ready) => {
    if (ready) {
      nextTick().then(() => scrollToToday());
    }
  });

  return {
    scrollContainer,
    todayElement,
    scrollToToday,
    /** Get the actual scrollable element (useful for infinite scroll setup) */
    getScrollableElement,
  };
};
