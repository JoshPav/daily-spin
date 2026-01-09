import { ref, computed, onMounted, onUnmounted } from 'vue';

export const useCarousel = <T>(
  items: T[],
  options: { loop?: boolean } = {},
) => {
  const currentIndex = ref(0);
  const transitionName = ref<'slide-left' | 'slide-right'>('slide-right');

  // Touch/swipe handling
  const touchStartX = ref(0);
  const touchEndX = ref(0);
  const touchStartY = ref(0);
  const touchEndY = ref(0);
  const isSwiping = ref(false);

  const currentItem = computed(() => items[currentIndex.value]!);

  const prev = () => {
    transitionName.value = 'slide-right';
    if (currentIndex.value > 0) {
      currentIndex.value--;
    } else if (options.loop) {
      // Loop to the last item
      currentIndex.value = items.length - 1;
    }
  };

  const next = () => {
    transitionName.value = 'slide-left';
    if (currentIndex.value < items.length - 1) {
      currentIndex.value++;
    } else if (options.loop) {
      // Loop back to the first item
      currentIndex.value = 0;
    }
  };

  const goTo = (index: number) => {
    if (index === currentIndex.value) return;
    transitionName.value =
      index > currentIndex.value ? 'slide-left' : 'slide-right';
    currentIndex.value = index;
  };

  // Touch/swipe handlers
  const handleTouchStart = (e: TouchEvent) => {
    const [touchStart] = e.touches;

    if (!touchStart) return;

    touchStartX.value = touchStart.clientX;
    touchStartY.value = touchStart.clientY;
    isSwiping.value = false;
  };

  const handleTouchMove = (e: TouchEvent) => {
    const [touchEnd] = e.touches;

    if (!touchEnd) return;
    touchEndX.value = touchEnd.clientX;
    touchEndY.value = touchEnd.clientY;

    // Calculate distances
    const deltaX = Math.abs(touchEndX.value - touchStartX.value);
    const deltaY = Math.abs(touchEndY.value - touchStartY.value);

    // If horizontal swipe is more prominent than vertical, mark as swiping
    if (deltaX > deltaY && deltaX > 10) {
      isSwiping.value = true;
      // Prevent vertical scrolling when swiping horizontally
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping.value) return;

    const swipeDistance = touchStartX.value - touchEndX.value;
    const minSwipeDistance = 50; // Minimum distance for a swipe to register

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {
        // Swiped left, go to next
        next();
      } else {
        // Swiped right, go to previous
        prev();
      }
    }

    // Reset values
    touchStartX.value = 0;
    touchEndX.value = 0;
    touchStartY.value = 0;
    touchEndY.value = 0;
    isSwiping.value = false;
  };

  // Keyboard navigation
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prev();
    } else if (e.key === 'ArrowRight') {
      next();
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  const touchHandlers = {
    onTouchstart: handleTouchStart,
    onTouchmove: handleTouchMove,
    onTouchend: handleTouchEnd,
  };

  return {
    currentIndex,
    currentItem,
    transitionName,
    prev,
    next,
    goTo,
    touchHandlers,
  };
};
