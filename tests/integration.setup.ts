import { config } from 'dotenv';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import {
  clearTestDatabase,
  setupTestDatabase,
  teardownTestDatabase,
} from './db/setup';

// Mock consola FIRST before any other imports
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

import '~~/tests/mocks/nitroMock';
import '~~/tests/mocks/spotifyMock';

// Load test environment variables
config({ path: '.env.test' });

export const mockRuntimeConfig: Record<string, unknown> = {};

vi.stubGlobal('useRuntimeConfig', () => mockRuntimeConfig);

beforeAll(async () => {
  await setupTestDatabase();
});

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});
