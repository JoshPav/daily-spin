import type { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { vi } from 'vitest';

export const mockSpotifyApi: SpotifyApi = {
  player: {
    getRecentlyPlayedTracks: vi.fn(),
  },
  playlists: {
    createPlaylist: vi.fn(),
    getPlaylist: vi.fn(),
    changePlaylistDetails: vi.fn(),
    updatePlaylistItems: vi.fn(),
  },
  albums: {
    tracks: vi.fn(),
  },
  currentUser: {
    profile: vi.fn(),
  },
  // biome-ignore lint/suspicious/noExplicitAny: Creating mock client
} as any;

export const mockWithAccessToken = vi.fn().mockReturnValue(mockSpotifyApi);

vi.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: mockWithAccessToken,
  },
}));
