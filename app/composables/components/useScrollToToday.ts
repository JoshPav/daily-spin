import {
  type ComponentPublicInstance,
  nextTick,
  onMounted,
  onUnmounted,
  type Ref,
  ref,
  watch,
} from 'vue';

export interface UseScrollToTodayOptions {
  isReady: Ref<boolean>;
  /** Optional ref to a scroll container (either a UScrollArea component or plain HTML element) */
  scrollAreaRef?: Ref<ComponentPublicInstance | HTMLElement | null>;
}

// Breakpoint for mobile detection (matches Tailwind's md breakpoint)
const MOBILE_BREAKPOINT = 768;

export const useScrollToToday = ({
  isReady,
  scrollAreaRef,
}: UseScrollToTodayOptions) => {
  const scrollContainer = ref<HTMLElement | null>(null);
  const todayElement = ref<HTMLElement | null>(null);
  const isTodayVisible = ref(true);

  let intersectionObserver: IntersectionObserver | null = null;

  // Get the actual scrollable element (either direct ref or ScrollArea's viewport)
  const getScrollableElement = (): HTMLElement | null => {
    if (scrollAreaRef?.value) {
      const ref = scrollAreaRef.value;
      // Check if it's a plain HTML element
      if (ref instanceof HTMLElement) {
        return ref;
      }
      // UScrollArea component: the viewport is the scrollable element inside $el
      const el = ref.$el as HTMLElement;
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

  // Calculate the root margin for the intersection observer
  // Desktop: Show button when today leaves the visible area
  // Mobile: Show button earlier since less content is visible
  const calculateRootMargin = (): string => {
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    // On mobile, use a smaller threshold so button appears sooner
    // On desktop, allow more scroll before showing the button
    const margin = isMobile ? '-10%' : '-20%';
    return `${margin} 0px ${margin} 0px`;
  };

  const setupIntersectionObserver = () => {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
    }

    const container = getScrollableElement();
    if (!container || !todayElement.value) {
      return;
    }

    intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          isTodayVisible.value = entry.isIntersecting;
        }
      },
      {
        root: container,
        rootMargin: calculateRootMargin(),
        threshold: 0,
      },
    );

    intersectionObserver.observe(todayElement.value);
  };

  // Re-setup observer when viewport size changes
  const handleResize = () => {
    setupIntersectionObserver();
  };

  onMounted(async () => {
    if (isReady.value) {
      await nextTick();
      scrollToToday();
    }

    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
    }
    window.removeEventListener('resize', handleResize);
  });

  watch(isReady, (ready) => {
    if (ready) {
      nextTick().then(() => scrollToToday());
    }
  });

  // Watch for todayElement changes to setup observer
  watch(todayElement, (newEl) => {
    if (newEl) {
      nextTick().then(() => setupIntersectionObserver());
    }
  });

  return {
    scrollContainer,
    todayElement,
    scrollToToday,
    /** Get the actual scrollable element (useful for infinite scroll setup) */
    getScrollableElement,
    /** Whether today's element is currently visible in the viewport */
    isTodayVisible,
  };
};
