import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useScrollToToday } from './useScrollToToday';

describe('useScrollToToday', () => {
  const originalGetComputedStyle = window.getComputedStyle;

  const createMockElement = (
    overrides: Partial<{
      offsetTop: number;
      offsetHeight: number;
      overflowY: string;
    }> = {},
  ) => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'offsetTop', {
      value: overrides.offsetTop ?? 0,
      configurable: true,
    });
    Object.defineProperty(element, 'offsetHeight', {
      value: overrides.offsetHeight ?? 100,
      configurable: true,
    });
    element.scrollTo = vi.fn();

    // Store overflowY value for the mock getComputedStyle
    (element as any).__overflowY = overrides.overflowY ?? 'visible';

    return element;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock getComputedStyle to return our test values
    window.getComputedStyle = vi.fn((el: Element) => {
      return {
        overflowY: (el as any).__overflowY ?? 'visible',
      } as CSSStyleDeclaration;
    });
  });

  afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle;
  });

  describe('scrollToToday', () => {
    it('should scroll to center the today element in the container', async () => {
      const isReady = ref(false);
      const { scrollContainer, todayElement, scrollToToday } = useScrollToToday(
        { isReady },
      );

      const container = createMockElement({
        offsetTop: 0,
        offsetHeight: 500,
        overflowY: 'auto',
      });
      const today = createMockElement({
        offsetTop: 1000,
        offsetHeight: 100,
      });

      scrollContainer.value = container;
      todayElement.value = today;

      scrollToToday();

      expect(container.scrollTo).toHaveBeenCalledWith({
        top: 800, // 1000 - 0 - (500/2) + (100/2) = 1000 - 250 + 50 = 800
        behavior: 'smooth',
      });
    });

    it('should not scroll if scrollContainer is null', async () => {
      const isReady = ref(false);
      const { todayElement, scrollToToday } = useScrollToToday({ isReady });

      const today = createMockElement();
      todayElement.value = today;

      scrollToToday();

      expect(today.scrollTo).not.toHaveBeenCalled();
    });

    it('should not scroll if todayElement is null', async () => {
      const isReady = ref(false);
      const { scrollContainer, scrollToToday } = useScrollToToday({ isReady });

      const container = createMockElement({ overflowY: 'auto' });
      scrollContainer.value = container;

      scrollToToday();

      expect(container.scrollTo).not.toHaveBeenCalled();
    });

    it('should warn and not scroll if container is not scrollable', async () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const isReady = ref(false);
      const { scrollContainer, todayElement, scrollToToday } = useScrollToToday(
        { isReady },
      );

      const container = createMockElement({ overflowY: 'visible' });
      const today = createMockElement();

      scrollContainer.value = container;
      todayElement.value = today;

      scrollToToday();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'scrollContainer ref is not on a scrollable element',
        ),
      );
      expect(container.scrollTo).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should scroll when container has overflow-y: scroll', async () => {
      const isReady = ref(false);
      const { scrollContainer, todayElement, scrollToToday } = useScrollToToday(
        { isReady },
      );

      const container = createMockElement({ overflowY: 'scroll' });
      const today = createMockElement();

      scrollContainer.value = container;
      todayElement.value = today;

      scrollToToday();

      expect(container.scrollTo).toHaveBeenCalled();
    });

    it('should scroll when container has overflow-y: auto', async () => {
      const isReady = ref(false);
      const { scrollContainer, todayElement, scrollToToday } = useScrollToToday(
        { isReady },
      );

      const container = createMockElement({ overflowY: 'auto' });
      const today = createMockElement();

      scrollContainer.value = container;
      todayElement.value = today;

      scrollToToday();

      expect(container.scrollTo).toHaveBeenCalled();
    });
  });

  describe('refs', () => {
    it('should return scrollContainer ref initialized to null', () => {
      const isReady = ref(false);
      const { scrollContainer } = useScrollToToday({ isReady });

      expect(scrollContainer.value).toBeNull();
    });

    it('should return todayElement ref initialized to null', () => {
      const isReady = ref(false);
      const { todayElement } = useScrollToToday({ isReady });

      expect(todayElement.value).toBeNull();
    });
  });
});
