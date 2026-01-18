import { vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGetAccessToken: vi.fn(),
}));

vi.mock('~~/shared/auth', () => ({
  auth: {
    api: {
      getAccessToken: mocks.mockGetAccessToken,
    },
  },
}));

export const mockGetAccessToken = mocks.mockGetAccessToken;
