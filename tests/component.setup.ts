import { afterEach, vi } from 'vitest';

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Mock IntersectionObserver as a proper constructor class
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: readonly number[] = [];

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

// Mock Element.scrollTo for scroll-to-today functionality
Element.prototype.scrollTo = vi.fn();
