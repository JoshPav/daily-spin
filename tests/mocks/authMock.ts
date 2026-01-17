import { vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGetAccessToken: vi.fn(),
  mockRefreshSpotifyToken: vi.fn(),
}));

vi.mock('~~/shared/auth', () => ({
  auth: {
    api: {
      getAccessToken: mocks.mockGetAccessToken,
    },
  },
  refreshSpotifyToken: mocks.mockRefreshSpotifyToken,
}));

export const mockGetAccessToken = mocks.mockGetAccessToken;
export const mockRefreshSpotifyToken = mocks.mockRefreshSpotifyToken;
