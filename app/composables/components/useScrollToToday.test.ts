/** biome-ignore-all lint/style/noNonNullAssertion: ignore potential nulls for test code */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useScrollToToday } from './useScrollToToday';

describe('useScrollToToday', () => {
  const originalGetComputedStyle = window.getComputedStyle;
  const originalIntersectionObserver = window.IntersectionObserver;
  const originalInnerWidth = window.innerWidth;

  const mockIntersectionObserverInstances: Array<{
    observe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    callback: IntersectionObserverCallback;
  }> = [];

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
    // biome-ignore lint/suspicious/noExplicitAny: needed to set overflow
    (element as any).__overflowY = overrides.overflowY ?? 'visible';

    return element;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIntersectionObserverInstances.length = 0;

    // Mock getComputedStyle to return our test values
    window.getComputedStyle = vi.fn((el: Element) => {
      return {
        // biome-ignore lint/suspicious/noExplicitAny: needed to set overflow
        overflowY: (el as any).__overflowY ?? 'visible',
      } as CSSStyleDeclaration;
    });

    // Mock IntersectionObserver as a proper class
    class MockIntersectionObserver {
      observe = vi.fn();
      disconnect = vi.fn();
      callback: IntersectionObserverCallback;

      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        mockIntersectionObserverInstances.push(this);
      }
    }
    window.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;

    // Mock window.innerWidth for responsive tests
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle;
    window.IntersectionObserver = originalIntersectionObserver;
    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth,
      writable: true,
      configurable: true,
    });
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

    it('should return isTodayVisible ref initialized to true', () => {
      const isReady = ref(false);
      const { isTodayVisible } = useScrollToToday({ isReady });

      expect(isTodayVisible.value).toBe(true);
    });
  });

  describe('isTodayVisible', () => {
    it('should set up IntersectionObserver when todayElement is set', async () => {
      const isReady = ref(true);
      const container = createMockElement({ overflowY: 'auto' });
      const scrollAreaRef = ref<HTMLElement | null>(container);

      const { todayElement } = useScrollToToday({ isReady, scrollAreaRef });

      const today = createMockElement();
      todayElement.value = today;

      // Wait for the watcher callback and its nextTick to complete
      await nextTick();
      await nextTick();

      expect(mockIntersectionObserverInstances.length).toBe(1);
      expect(
        mockIntersectionObserverInstances[0]!.observe,
      ).toHaveBeenCalledWith(today);
    });

    it('should update isTodayVisible when IntersectionObserver fires', async () => {
      const isReady = ref(true);
      const container = createMockElement({ overflowY: 'auto' });
      const scrollAreaRef = ref<HTMLElement | null>(container);

      const { todayElement, isTodayVisible } = useScrollToToday({
        isReady,
        scrollAreaRef,
      });

      const today = createMockElement();
      todayElement.value = today;

      // Wait for the watcher callback and its nextTick to complete
      await nextTick();
      await nextTick();

      // Simulate today element going out of view
      const observer = mockIntersectionObserverInstances[0]!;
      observer.callback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );

      expect(isTodayVisible.value).toBe(false);

      // Simulate today element coming back into view
      observer.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );

      expect(isTodayVisible.value).toBe(true);
    });

    it('should disconnect IntersectionObserver when todayElement changes', async () => {
      const isReady = ref(true);
      const container = createMockElement({ overflowY: 'auto' });
      const scrollAreaRef = ref<HTMLElement | null>(container);

      const { todayElement } = useScrollToToday({ isReady, scrollAreaRef });

      const today1 = createMockElement();
      const today2 = createMockElement();

      todayElement.value = today1;

      // Wait for the watcher callback and its nextTick to complete
      await nextTick();
      await nextTick();

      const firstObserver = mockIntersectionObserverInstances[0]!;
      expect(firstObserver.observe).toHaveBeenCalledWith(today1);

      // Change the today element
      todayElement.value = today2;

      // Wait for the watcher callback and its nextTick to complete
      await nextTick();
      await nextTick();

      // First observer should be disconnected
      expect(firstObserver.disconnect).toHaveBeenCalled();

      // New observer should be created and observing the new element
      const secondObserver = mockIntersectionObserverInstances[1]!;
      expect(secondObserver.observe).toHaveBeenCalledWith(today2);
    });
  });
});
