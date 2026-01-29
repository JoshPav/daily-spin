/**
 * Shared test setup for backlog add page component tests.
 *
 * NOTE: useSpotifyAlbumSearch is mocked directly in the test file using vi.mock
 * because mockNuxtImport doesn't work reliably for composables in subdirectories.
 */
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime';
import type { SimplifiedAlbum } from '@spotify/web-api-ts-sdk';
import { readBody } from 'h3';
import { computed, ref } from 'vue';
import type { AddBacklogItemsResponse } from '~~/shared/schema';
import { mountPage } from '~~/tests/component';
import {
  simplifiedAlbum,
  simplifiedArtist,
} from '~~/tests/factories/spotify.factory';

// Track added albums for assertions
export let addedAlbums: Array<{
  spotifyId: string;
  name: string;
  imageUrl: string | undefined;
  releaseDate: string;
  totalTracks: number;
  artists: Array<{
    spotifyId: string;
    name: string;
    imageUrl: string | undefined;
  }>;
}> = [];

export const resetAddMockState = () => {
  addedAlbums = [];
};

// Mock useAuth to bypass auth loading
mockNuxtImport('useAuth', () => {
  return () => ({
    loggedIn: computed(() => true),
    user: computed(() => ({
      id: 'test-user-id',
      name: 'Test User',
      image: 'https://example.com/avatar.jpg',
      initial: 'T',
    })),
    loading: ref(false),
    requiresReauth: computed(() => false),
  });
});

// Register endpoint mock for POST /api/backlog
registerEndpoint('/api/backlog', {
  method: 'POST',
  handler: async (event) => {
    const body = await readBody(event);
    addedAlbums = body;
    return {
      added: body.length,
      skipped: [],
    } satisfies AddBacklogItemsResponse;
  },
});

/**
 * Mount the add to backlog page
 */
export const mountAddPage = () => mountPage('/backlog/add');

/**
 * Create a mock search result album
 */
export const createSearchResultAlbum = (
  overrides: Partial<SimplifiedAlbum> = {},
): SimplifiedAlbum => {
  return simplifiedAlbum({
    album_type: 'album',
    total_tracks: 10,
    ...overrides,
  });
};

/**
 * Create multiple search result albums
 */
export const createSearchResultAlbums = (count: number): SimplifiedAlbum[] => {
  return Array.from({ length: count }, (_, i) =>
    createSearchResultAlbum({
      id: `album-${i + 1}`,
      name: `Test Album ${i + 1}`,
      artists: [
        simplifiedArtist({
          id: `artist-${i + 1}`,
          name: `Artist ${i + 1}`,
        }),
      ],
    }),
  );
};
