import type { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { vi } from 'vitest';

export const mockSpotifyApi: SpotifyApi = {
  player: {
    getRecentlyPlayedTracks: vi.fn(),
  },
  // biome-ignore lint/suspicious/noExplicitAny: Creating mock client
} as any;

export const mockWithAccessToken = vi.fn().mockReturnValue(mockSpotifyApi);

vi.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: mockWithAccessToken,
  },
}));
