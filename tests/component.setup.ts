import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { resetListensState } from '~/composables/api/useListens';

// Create MSW server - handlers will be added per-test
export const mswServer = setupServer();

// Start MSW server before all tests
beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: 'bypass' });
});

// Reset handlers and clean up after each test
afterEach(() => {
  mswServer.resetHandlers();
  vi.clearAllMocks();
  // Reset module-level singleton state for test isolation
  resetListensState();
});

// Close MSW server after all tests
afterAll(() => {
  mswServer.close();
});

// Mock consola to suppress logging during tests
const mockLogger = vi.hoisted(() => {
  // biome-ignore lint/suspicious/noExplicitAny: Mock can return any type
  const createMockLogger = (): any => {
    const mock = {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      success: vi.fn(),
      start: vi.fn(),
      ready: vi.fn(),
      box: vi.fn(),
      withTag: vi.fn(() => createMockLogger()),
    };
    return mock;
  };

  return createMockLogger();
});

vi.mock('consola', () => ({
  createConsola: vi.fn(() => mockLogger),
  consola: mockLogger,
  default: mockLogger,
}));

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

// Mock better-auth client
vi.mock('~/lib/auth-client', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  useSession: vi.fn(() => ({
    value: {
      data: {
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://example.com/avatar.jpg',
        },
      },
      isPending: false,
    },
  })),
  getSession: vi.fn(),
  getAccessToken: vi.fn(),
}));
