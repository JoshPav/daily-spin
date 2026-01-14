import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import {
  clearTestDatabase,
  setupTestDatabase,
  teardownTestDatabase,
} from './db/setup';

import '~~/tests/mocks/nitroMock';
import '~~/tests/mocks/spotifyMock';

vi.stubGlobal('useRuntimeConfig', () => ({}));

beforeAll(async () => {
  await setupTestDatabase();
});

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});
