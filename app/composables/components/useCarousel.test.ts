import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { useCarousel } from './useCarousel';

describe('useCarousel', () => {
  const testItems = ['item1', 'item2', 'item3'];

  const createWrapper = <T>(items: T[], options?: { loop?: boolean }) => {
    let result: ReturnType<typeof useCarousel<T>>;

    const TestComponent = defineComponent({
      setup() {
        result = useCarousel(items, options);
        return () => h('div');
      },
    });

    const wrapper = mount(TestComponent);
    // biome-ignore lint/style/noNonNullAssertion: result won't be undefined
    return { wrapper, result: result! };
  };

  describe('initial state', () => {
    it('should start at index 0', () => {
      const { result } = createWrapper(testItems);
      const { currentIndex } = result;

      expect(currentIndex.value).toBe(0);
    });

    it('should return first item as current', () => {
      const { currentItem } = useCarousel(testItems);

      expect(currentItem.value).toBe('item1');
    });

    it('should have slide-right as default transition', () => {
      const { transitionName } = useCarousel(testItems);

      expect(transitionName.value).toBe('slide-right');
    });
  });

  describe('next', () => {
    it('should advance to next item', () => {
      const { currentIndex, next } = useCarousel(testItems);

      next();

      expect(currentIndex.value).toBe(1);
    });

    it('should update currentItem when advancing', () => {
      const { currentItem, next } = useCarousel(testItems);

      next();

      expect(currentItem.value).toBe('item2');
    });

    it('should set transition to slide-left', () => {
      const { transitionName, next } = useCarousel(testItems);

      next();

      expect(transitionName.value).toBe('slide-left');
    });

    it('should not advance past last item without loop', () => {
      const { currentIndex, next } = useCarousel(testItems);

      next();
      next();
      next();
      next();

      expect(currentIndex.value).toBe(2);
    });

    it('should loop to first item when loop option is enabled', () => {
      const { currentIndex, next } = useCarousel(testItems, { loop: true });

      next();
      next();
      next();

      expect(currentIndex.value).toBe(0);
    });
  });

  describe('prev', () => {
    it('should go to previous item', () => {
      const { currentIndex, next, prev } = useCarousel(testItems);

      next();
      next();
      prev();

      expect(currentIndex.value).toBe(1);
    });

    it('should update currentItem when going back', () => {
      const { currentItem, next, prev } = useCarousel(testItems);

      next();
      next();
      prev();

      expect(currentItem.value).toBe('item2');
    });

    it('should set transition to slide-right', () => {
      const { transitionName, next, prev } = useCarousel(testItems);

      next();
      prev();

      expect(transitionName.value).toBe('slide-right');
    });

    it('should not go before first item without loop', () => {
      const { currentIndex, prev } = useCarousel(testItems);

      prev();
      prev();

      expect(currentIndex.value).toBe(0);
    });

    it('should loop to last item when loop option is enabled', () => {
      const { currentIndex, prev } = useCarousel(testItems, { loop: true });

      prev();

      expect(currentIndex.value).toBe(2);
    });
  });

  describe('goTo', () => {
    it('should jump to specified index', () => {
      const { currentIndex, goTo } = useCarousel(testItems);

      goTo(2);

      expect(currentIndex.value).toBe(2);
    });

    it('should update currentItem', () => {
      const { currentItem, goTo } = useCarousel(testItems);

      goTo(1);

      expect(currentItem.value).toBe('item2');
    });

    it('should set slide-left transition when moving forward', () => {
      const { transitionName, goTo } = useCarousel(testItems);

      goTo(2);

      expect(transitionName.value).toBe('slide-left');
    });

    it('should set slide-right transition when moving backward', () => {
      const { transitionName, goTo } = useCarousel(testItems);

      goTo(2);
      goTo(0);

      expect(transitionName.value).toBe('slide-right');
    });

    it('should not change when jumping to current index', () => {
      const { currentIndex, goTo } = useCarousel(testItems);

      goTo(0);

      expect(currentIndex.value).toBe(0);
    });
  });

  describe('keyboard navigation', () => {
    it('should advance on ArrowRight key', () => {
      const { wrapper, result } = createWrapper(testItems);
      const { currentIndex } = result;

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      window.dispatchEvent(event);

      expect(currentIndex.value).toBe(1);
      wrapper.unmount();
    });

    it('should go back on ArrowLeft key', () => {
      const { wrapper, result } = createWrapper(testItems);
      const { currentIndex, next } = result;

      next();

      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      window.dispatchEvent(event);

      expect(currentIndex.value).toBe(0);
      wrapper.unmount();
    });
  });

  describe('touch handlers', () => {
    it('should provide touch handlers object', () => {
      const { touchHandlers } = useCarousel(testItems);

      expect(touchHandlers).toHaveProperty('onTouchstart');
      expect(touchHandlers).toHaveProperty('onTouchmove');
      expect(touchHandlers).toHaveProperty('onTouchend');
    });

    it('should advance when swiping left', () => {
      const { currentIndex, touchHandlers } = useCarousel(testItems);

      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 200, clientY: 100 } as Touch],
      });
      touchHandlers.onTouchstart(touchStart);

      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      });
      touchHandlers.onTouchmove(touchMove);

      touchHandlers.onTouchend();

      expect(currentIndex.value).toBe(1);
    });

    it('should go back when swiping right', () => {
      const { currentIndex, next, touchHandlers } = useCarousel(testItems);

      next();

      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      });
      touchHandlers.onTouchstart(touchStart);

      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 200, clientY: 100 } as Touch],
      });
      touchHandlers.onTouchmove(touchMove);

      touchHandlers.onTouchend();

      expect(currentIndex.value).toBe(0);
    });

    it('should not swipe if distance is too small', () => {
      const { currentIndex, touchHandlers } = useCarousel(testItems);

      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 150, clientY: 100 } as Touch],
      });
      touchHandlers.onTouchstart(touchStart);

      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 130, clientY: 100 } as Touch],
      });
      touchHandlers.onTouchmove(touchMove);

      touchHandlers.onTouchend();

      expect(currentIndex.value).toBe(0);
    });
  });
});
