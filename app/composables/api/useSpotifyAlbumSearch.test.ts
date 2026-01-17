import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpotifyAlbumSearch } from './useSpotifyAlbumSearch';

const mockSearch = vi.fn();
const mockSpotifyApi = {
  search: mockSearch,
};

const mockSearchResponse = {
  albums: {
    items: [
      {
        id: 'album1',
        name: 'Test Album 1',
        artists: [{ name: 'Artist 1' }],
        images: [{ url: 'https://example.com/image1.jpg' }],
      },
      {
        id: 'album2',
        name: 'Test Album 2',
        artists: [{ name: 'Artist 2' }],
        images: [{ url: 'https://example.com/image2.jpg' }],
      },
    ],
  },
};

describe('useSpotifyAlbumSearch', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'useSpotifyApi',
      vi.fn(async () => mockSpotifyApi),
    );
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should initialize with empty search query', () => {
      const { searchQuery } = useSpotifyAlbumSearch();

      expect(searchQuery.value).toBe('');
    });

    it('should initialize with empty results', () => {
      const { searchResults } = useSpotifyAlbumSearch();

      expect(searchResults.value).toEqual([]);
    });

    it('should initialize loading as false', () => {
      const { loading } = useSpotifyAlbumSearch();

      expect(loading.value).toBe(false);
    });

    it('should initialize error as null', () => {
      const { error } = useSpotifyAlbumSearch();

      expect(error.value).toBeNull();
    });
  });

  describe('search', () => {
    it('should update searchQuery', () => {
      const { searchQuery, search } = useSpotifyAlbumSearch();

      search('test query');

      expect(searchQuery.value).toBe('test query');
    });

    it('should clear results for empty query', () => {
      const { searchResults, search } = useSpotifyAlbumSearch();

      mockSearch.mockResolvedValue(mockSearchResponse);

      search('test');
      vi.advanceTimersByTime(500);

      search('');

      expect(searchResults.value).toEqual([]);
    });

    it('should debounce search requests', async () => {
      const { search } = useSpotifyAlbumSearch();

      mockSearch.mockResolvedValue(mockSearchResponse);

      search('test');
      search('test query');
      search('test query final');

      expect(mockSearch).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);

      await vi.runAllTimersAsync();

      expect(mockSearch).toHaveBeenCalledTimes(1);
    });

    it('should call Spotify API with correct parameters', async () => {
      const { search } = useSpotifyAlbumSearch();

      mockSearch.mockResolvedValue(mockSearchResponse);

      search('test album');
      vi.advanceTimersByTime(500);

      await vi.runAllTimersAsync();

      expect(mockSearch).toHaveBeenCalledWith(
        'test album',
        ['album'],
        undefined,
        5,
      );
    });

    it('should set loading to true during search', async () => {
      const { loading, search } = useSpotifyAlbumSearch();

      mockSearch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockSearchResponse), 100);
          }),
      );

      search('test');
      vi.advanceTimersByTime(500);

      expect(loading.value).toBe(true);
    });

    it('should set loading to false after search completes', async () => {
      const { loading, search } = useSpotifyAlbumSearch();

      mockSearch.mockResolvedValue(mockSearchResponse);

      search('test');
      vi.advanceTimersByTime(500);

      await vi.runAllTimersAsync();

      expect(loading.value).toBe(false);
    });

    it('should update searchResults with API response', async () => {
      const { searchResults, search } = useSpotifyAlbumSearch();

      mockSearch.mockResolvedValue(mockSearchResponse);

      search('test');
      vi.advanceTimersByTime(500);

      await vi.runAllTimersAsync();

      expect(searchResults.value).toEqual(mockSearchResponse.albums.items);
    });

    it('should handle API errors', async () => {
      const { error, searchResults, search } = useSpotifyAlbumSearch();

      mockSearch.mockRejectedValue(new Error('API Error'));

      search('test');
      vi.advanceTimersByTime(500);

      await vi.runAllTimersAsync();

      expect(error.value).toBe('API Error');
      expect(searchResults.value).toEqual([]);
    });

    it('should handle non-Error exceptions', async () => {
      const { error, search } = useSpotifyAlbumSearch();

      mockSearch.mockRejectedValue('String error');

      search('test');
      vi.advanceTimersByTime(500);

      await vi.runAllTimersAsync();

      expect(error.value).toBe('Search failed');
    });

    it('should clear error on successful search', async () => {
      const { error, search } = useSpotifyAlbumSearch();

      mockSearch.mockRejectedValueOnce(new Error('API Error'));
      search('test');
      vi.advanceTimersByTime(500);
      await vi.runAllTimersAsync();

      expect(error.value).toBe('API Error');

      mockSearch.mockResolvedValue(mockSearchResponse);
      search('test2');
      vi.advanceTimersByTime(500);
      await vi.runAllTimersAsync();

      expect(error.value).toBeNull();
    });

    it('should handle empty results from API', async () => {
      const { searchResults, search } = useSpotifyAlbumSearch();

      mockSearch.mockResolvedValue({ albums: { items: [] } });

      search('nonexistent album');
      vi.advanceTimersByTime(500);

      await vi.runAllTimersAsync();

      expect(searchResults.value).toEqual([]);
    });

    it('should handle missing albums in response', async () => {
      const { searchResults, search } = useSpotifyAlbumSearch();

      mockSearch.mockResolvedValue({});

      search('test');
      vi.advanceTimersByTime(500);

      await vi.runAllTimersAsync();

      expect(searchResults.value).toEqual([]);
    });

    it('should cancel pending search when new search is initiated', async () => {
      const { search } = useSpotifyAlbumSearch();

      mockSearch.mockResolvedValue(mockSearchResponse);

      search('first');
      vi.advanceTimersByTime(200);

      search('second');
      vi.advanceTimersByTime(500);

      await vi.runAllTimersAsync();

      expect(mockSearch).toHaveBeenCalledTimes(1);
      expect(mockSearch).toHaveBeenCalledWith(
        'second',
        ['album'],
        undefined,
        5,
      );
    });
  });
});
