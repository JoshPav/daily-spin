/**
 * Component tests for the backlog add page.
 * Tests search functionality, album selection, and adding to backlog.
 */
import { registerEndpoint } from '@nuxt/test-utils/runtime';
import type { SimplifiedAlbum } from '@spotify/web-api-ts-sdk';
import { readBody } from 'h3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { AddBacklogItemsResponse } from '~~/shared/schema';
import {
  cleanupAfterTest,
  fireEvent,
  mountPage,
  screen,
  waitFor,
} from '~~/tests/component';
import { mockUseAuth } from '~~/tests/component/authMock';
import {
  simplifiedAlbum,
  simplifiedArtist,
} from '~~/tests/factories/spotify.factory';

// Track added albums for assertions
let addedAlbums: Array<{
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

const resetAddMockState = () => {
  addedAlbums = [];
};

// Mock useAuth to bypass auth loading (must be at module level)
mockUseAuth();

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

const mountAddPage = () => mountPage('/backlog/add');

/**
 * Create multiple search result albums
 */
const createSearchResultAlbums = (count: number): SimplifiedAlbum[] => {
  return Array.from({ length: count }, (_, i) =>
    simplifiedAlbum({
      id: `album-${i + 1}`,
      name: `Test Album ${i + 1}`,
      album_type: 'album',
      total_tracks: 10,
      artists: [
        simplifiedArtist({
          id: `artist-${i + 1}`,
          name: `Artist ${i + 1}`,
        }),
      ],
    }),
  );
};

// Create mock state that will be used by vi.mock
const mockSearchResults = ref<SimplifiedAlbum[]>([]);
const mockLoading = ref(false);
const mockSearchFn = vi.fn();

// Mock the composable using vi.mock which gets hoisted
vi.mock('~~/app/composables/api/spotify/useSpotifyAlbumSearch', () => ({
  useSpotifyAlbumSearch: () => ({
    searchQuery: ref(''),
    searchResults: mockSearchResults,
    loading: mockLoading,
    error: ref<string | null>(null),
    allowEPs: ref(false),
    search: mockSearchFn,
  }),
}));

// Mock useSpotifyApi to prevent network requests when adding albums
vi.mock('~~/app/composables/api/spotify/useSpotifyApi', () => ({
  useSpotifyApi: async () => ({
    artists: {
      get: async () => [],
    },
  }),
}));

const setMockSearchResults = (results: SimplifiedAlbum[]) => {
  mockSearchResults.value = results;
};

const resetSearchMockState = () => {
  mockSearchResults.value = [];
  mockLoading.value = false;
  mockSearchFn.mockClear();
};

describe('Add to Backlog Page', () => {
  const TODAY = new Date('2026-01-15T12:00:00.000Z');

  beforeEach(() => {
    vi.setSystemTime(TODAY);
    resetAddMockState();
    resetSearchMockState();
    clearNuxtData('backlog');
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanupAfterTest();
  });

  describe('page layout', () => {
    it('should render the page title', async () => {
      await mountAddPage();

      expect(
        screen.getByRole('heading', { name: 'Add to Backlog' }),
      ).toBeDefined();
    });

    it('should render the back button', async () => {
      await mountAddPage();

      const backButton = screen.getByRole('button', { name: /Back/i });
      expect(backButton).toBeDefined();
    });

    it('should render the search and featured tabs', async () => {
      await mountAddPage();

      await waitFor(() => screen.queryByText('Search') !== null);

      expect(screen.getByText('Search')).toBeDefined();
      expect(screen.getByText('Featured')).toBeDefined();
    });

    it('should render the search input', async () => {
      await mountAddPage();

      const searchInput = screen.getByPlaceholderText(
        /Search albums or artists/i,
      );
      expect(searchInput).toBeDefined();
    });

    it('should show empty state message when no search has been performed', async () => {
      await mountAddPage();

      await waitFor(
        () =>
          screen.queryByText('Search for albums to add to your backlog') !==
          null,
      );

      expect(
        screen.getByText('Search for albums to add to your backlog'),
      ).toBeDefined();
    });
  });

  describe('search functionality', () => {
    it('should display search results after searching', async () => {
      const mockAlbums = createSearchResultAlbums(3);

      await mountAddPage();

      // Set mock results AFTER mounting
      setMockSearchResults(mockAlbums);

      const searchInput = screen.getByPlaceholderText(
        /Search albums or artists/i,
      );
      await fireEvent.update(searchInput, 'test query');

      // Check if mock search was called
      expect(mockSearchFn).toHaveBeenCalledWith('test query');

      // Wait for Vue to re-render with the new data
      await waitFor(() => screen.queryByText('Test Album 1') !== null);

      expect(screen.getByText('Test Album 1')).toBeDefined();
      expect(screen.getByText('Test Album 2')).toBeDefined();
      expect(screen.getByText('Test Album 3')).toBeDefined();
    });

    it('should display artist names in search results', async () => {
      const mockAlbums = [
        simplifiedAlbum({
          id: 'album-1',
          name: 'My Album',
          album_type: 'album',
          total_tracks: 10,
          artists: [simplifiedArtist({ name: 'Cool Artist' })],
        }),
      ];
      setMockSearchResults(mockAlbums);

      await mountAddPage();

      const searchInput = screen.getByPlaceholderText(
        /Search albums or artists/i,
      );
      await fireEvent.update(searchInput, 'cool');

      await waitFor(() => screen.queryByText('My Album') !== null);

      expect(screen.getByText('Cool Artist')).toBeDefined();
    });

    it('should show no results message when search returns empty', async () => {
      setMockSearchResults([]);

      await mountAddPage();

      const searchInput = screen.getByPlaceholderText(
        /Search albums or artists/i,
      );
      await fireEvent.update(searchInput, 'nonexistent album xyz');

      await waitFor(() => screen.queryByText('No albums found') !== null);

      expect(screen.getByText('No albums found')).toBeDefined();
    });
  });

  describe('album selection', () => {
    const mockAlbums = createSearchResultAlbums(3);

    beforeEach(() => {
      setMockSearchResults(mockAlbums);
    });

    it('should select an album when clicked', async () => {
      await mountAddPage();

      const searchInput = screen.getByPlaceholderText(
        /Search albums or artists/i,
      );
      await fireEvent.update(searchInput, 'test');

      await waitFor(() => screen.queryByText('Test Album 1') !== null);

      // Click on the first album
      const albumItem = screen
        .getByText('Test Album 1')
        .closest('div[class*="cursor-pointer"]');
      expect(albumItem).not.toBeNull();
      await fireEvent.click(albumItem as HTMLElement);

      // Should show selection footer
      await waitFor(() => screen.queryByText('1 Album selected') !== null);

      expect(screen.getByText('1 Album selected')).toBeDefined();
    });

    it('should select multiple albums', async () => {
      await mountAddPage();

      const searchInput = screen.getByPlaceholderText(
        /Search albums or artists/i,
      );
      await fireEvent.update(searchInput, 'test');

      await waitFor(() => screen.queryByText('Test Album 1') !== null);

      // Click on first and second albums
      const album1 = screen
        .getByText('Test Album 1')
        .closest('div[class*="cursor-pointer"]');
      const album2 = screen
        .getByText('Test Album 2')
        .closest('div[class*="cursor-pointer"]');

      await fireEvent.click(album1 as HTMLElement);
      await waitFor(() => screen.queryByText('1 Album selected') !== null);

      await fireEvent.click(album2 as HTMLElement);
      await waitFor(() => screen.queryByText('2 Albums selected') !== null);

      expect(screen.getByText('2 Albums selected')).toBeDefined();
    });

    it('should deselect an album when clicked again', async () => {
      await mountAddPage();

      const searchInput = screen.getByPlaceholderText(
        /Search albums or artists/i,
      );
      await fireEvent.update(searchInput, 'test');

      await waitFor(() => screen.queryByText('Test Album 1') !== null);

      const albumItem = screen
        .getByText('Test Album 1')
        .closest('div[class*="cursor-pointer"]');

      // Select
      await fireEvent.click(albumItem as HTMLElement);
      await waitFor(() => screen.queryByText('1 Album selected') !== null);

      // Deselect
      await fireEvent.click(albumItem as HTMLElement);
      await waitFor(() => screen.queryByText('1 Album selected') === null);

      // Footer should be gone
      expect(screen.queryByText('1 Album selected')).toBeNull();
    });

    it('should clear all selections when Clear button is clicked', async () => {
      await mountAddPage();

      const searchInput = screen.getByPlaceholderText(
        /Search albums or artists/i,
      );
      await fireEvent.update(searchInput, 'test');

      await waitFor(() => screen.queryByText('Test Album 1') !== null);

      // Select two albums
      const album1 = screen
        .getByText('Test Album 1')
        .closest('div[class*="cursor-pointer"]');
      const album2 = screen
        .getByText('Test Album 2')
        .closest('div[class*="cursor-pointer"]');

      await fireEvent.click(album1 as HTMLElement);
      await fireEvent.click(album2 as HTMLElement);

      await waitFor(() => screen.queryByText('2 Albums selected') !== null);

      // Click Clear
      const clearButton = screen.getByRole('button', { name: /Clear/i });
      await fireEvent.click(clearButton);

      await waitFor(() => screen.queryByText('2 Albums selected') === null);

      // Footer should be gone
      expect(screen.queryByText('Albums selected')).toBeNull();
    });
  });

  describe('adding albums to backlog', () => {
    const mockAlbums = createSearchResultAlbums(2);

    beforeEach(() => {
      setMockSearchResults(mockAlbums);
    });

    it('should show Add button with correct count', async () => {
      await mountAddPage();

      const searchInput = screen.getByPlaceholderText(
        /Search albums or artists/i,
      );
      await fireEvent.update(searchInput, 'test');

      await waitFor(() => screen.queryByText('Test Album 1') !== null);

      const albumItem = screen
        .getByText('Test Album 1')
        .closest('div[class*="cursor-pointer"]');
      await fireEvent.click(albumItem as HTMLElement);

      await waitFor(() => screen.queryByText('Add 1 Album') !== null);

      expect(
        screen.getByRole('button', { name: /Add 1 Album/i }),
      ).toBeDefined();
    });

    it('should add selected albums when Add button is clicked', async () => {
      await mountAddPage();

      const searchInput = screen.getByPlaceholderText(
        /Search albums or artists/i,
      );
      await fireEvent.update(searchInput, 'test');

      await waitFor(() => screen.queryByText('Test Album 1') !== null);

      // Select an album
      const albumItem = screen
        .getByText('Test Album 1')
        .closest('div[class*="cursor-pointer"]');
      await fireEvent.click(albumItem as HTMLElement);

      await waitFor(() => screen.queryByText('Add 1 Album') !== null);

      // Click Add
      const addButton = screen.getByRole('button', { name: /Add 1 Album/i });
      await fireEvent.click(addButton);

      // Wait for the API call
      await waitFor(() => addedAlbums.length > 0);

      expect(addedAlbums.length).toBe(1);
      expect(addedAlbums[0]?.name).toBe('Test Album 1');
    });

    it('should add multiple albums at once', async () => {
      await mountAddPage();

      const searchInput = screen.getByPlaceholderText(
        /Search albums or artists/i,
      );
      await fireEvent.update(searchInput, 'test');

      await waitFor(() => screen.queryByText('Test Album 1') !== null);

      // Select both albums
      const album1 = screen
        .getByText('Test Album 1')
        .closest('div[class*="cursor-pointer"]');
      const album2 = screen
        .getByText('Test Album 2')
        .closest('div[class*="cursor-pointer"]');

      await fireEvent.click(album1 as HTMLElement);
      await fireEvent.click(album2 as HTMLElement);

      await waitFor(() => screen.queryByText('Add 2 Albums') !== null);

      // Click Add
      const addButton = screen.getByRole('button', { name: /Add 2 Albums/i });
      await fireEvent.click(addButton);

      await waitFor(() => addedAlbums.length === 2);

      expect(addedAlbums.length).toBe(2);
    });
  });

  describe('filters', () => {
    it('should render the filters button', async () => {
      await mountAddPage();

      const buttons = screen.getAllByRole('button');
      const filterButton = buttons.find(
        (btn) =>
          btn.textContent?.includes('Filters') ||
          btn.querySelector('[class*="filter"]'),
      );

      expect(filterButton).toBeDefined();
    });
  });
});
