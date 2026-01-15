import { config } from 'dotenv';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import {
  clearTestDatabase,
  setupTestDatabase,
  teardownTestDatabase,
} from './db/setup';

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
