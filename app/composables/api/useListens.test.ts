import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, type Ref, ref, watch } from 'vue';
import type { DailyListens } from '#shared/schema';

// Mock useState to return regular refs (simulating client-side behavior)
const stateStore = new Map<string, Ref<unknown>>();
vi.stubGlobal('useState', <T>(key: string, init: () => T) => {
  if (!stateStore.has(key)) {
    stateStore.set(key, ref(init()));
  }
  return stateStore.get(key) as Ref<T>;
});

// Stub Vue's watch function globally (auto-imported by Nuxt)
vi.stubGlobal('watch', watch);

// Mock useAuth
const mockAuthLoading = ref(false);
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    loading: mockAuthLoading,
    loggedIn: computed(() => true),
    user: computed(() => ({ id: 'user-1' })),
  }),
}));

// Import after mocks are set up
import { useListens } from './useListens';

const createDailyListen = (
  date: string,
  albums: DailyListens['albums'] = [],
): DailyListens => ({
  date,
  albums,
  favoriteSong: null,
});

const createAlbumListen = (id: string): DailyListens['albums'][0] => ({
  id: `listen-${id}`,
  album: {
    albumId: id,
    albumName: `Album ${id}`,
    imageUrl: 'https://example.com/image.jpg',
    artists: [{ name: 'Artist', spotifyId: 'artist-1' }],
  },
  listenMetadata: {
    listenOrder: 'ordered',
    listenMethod: 'spotify',
    listenTime: 'morning',
  },
});

const createFavoriteSong = (albumId: string): DailyListens['favoriteSong'] => ({
  spotifyId: 'track-1',
  name: 'My Favorite Song',
  trackNumber: 1,
  albumId,
});

describe('useListens', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('$fetch', mockFetch);
    // Clear state between tests
    stateStore.clear();
    // Reset auth loading state
    mockAuthLoading.value = false;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should initialize with empty data array', () => {
      mockAuthLoading.value = true; // Prevent auto-fetch
      const { data } = useListens();
      expect(data.value).toEqual([]);
    });

    it('should initialize with pending true', () => {
      mockAuthLoading.value = true;
      const { pending } = useListens();
      expect(pending.value).toBe(true);
    });

    it('should initialize with loadingMore false', () => {
      mockAuthLoading.value = true;
      const { loadingMore } = useListens();
      expect(loadingMore.value).toBe(false);
    });

    it('should initialize with hasMore true', () => {
      mockAuthLoading.value = true;
      const { hasMore } = useListens();
      expect(hasMore.value).toBe(true);
    });

    it('should initialize with error null', () => {
      mockAuthLoading.value = true;
      const { error } = useListens();
      expect(error.value).toBeNull();
    });
  });

  describe('fetchInitial', () => {
    it('should fetch initial data when auth finishes loading', async () => {
      mockAuthLoading.value = true;
      const mockData: DailyListens[] = [
        createDailyListen('2026-01-14T00:00:00.000Z', [
          createAlbumListen('album-1'),
        ]),
        createDailyListen('2026-01-15T00:00:00.000Z', [
          createAlbumListen('album-2'),
        ]),
      ];
      mockFetch.mockResolvedValueOnce(mockData);

      const { data, pending } = useListens();

      // Simulate auth finishing loading
      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      expect(mockFetch).toHaveBeenCalledWith('/api/listens', {
        query: {
          startDate: expect.stringContaining('2025-12-25'),
          endDate: expect.stringContaining('2026-01-15'),
        },
      });
      expect(data.value).toEqual(mockData);
      expect(pending.value).toBe(false);
    });

    it('should set error on fetch failure', async () => {
      mockAuthLoading.value = true;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { error, pending } = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      expect(error.value).toBeInstanceOf(Error);
      expect(error.value?.message).toBe('Network error');
      expect(pending.value).toBe(false);
    });

    it('should only fetch once even with multiple useListens calls', async () => {
      mockAuthLoading.value = true;
      mockFetch.mockResolvedValue([]);

      useListens();
      useListens();
      useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchMore', () => {
    it('should fetch older data and prepend to existing data', async () => {
      mockAuthLoading.value = true;
      const initialData: DailyListens[] = [
        createDailyListen('2026-01-14T00:00:00.000Z', [
          createAlbumListen('album-1'),
        ]),
      ];
      const olderData: DailyListens[] = [
        createDailyListen('2025-12-30T00:00:00.000Z', [
          createAlbumListen('album-2'),
        ]),
      ];
      mockFetch
        .mockResolvedValueOnce(initialData)
        .mockResolvedValueOnce(olderData);

      const { data, fetchMore } = useListens();

      // Wait for initial fetch
      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      // Fetch more
      await fetchMore();

      expect(data.value).toHaveLength(2);
      // Older data should be prepended
      expect(data.value[0]?.date).toBe('2025-12-30T00:00:00.000Z');
      expect(data.value[1]?.date).toBe('2026-01-14T00:00:00.000Z');
    });

    it('should set hasMore to false when batch has no actual listens', async () => {
      mockAuthLoading.value = true;
      const initialData: DailyListens[] = [
        createDailyListen('2026-01-14T00:00:00.000Z', [
          createAlbumListen('album-1'),
        ]),
      ];
      // Empty batch (days with no albums)
      const emptyBatch: DailyListens[] = [
        createDailyListen('2025-12-30T00:00:00.000Z', []),
        createDailyListen('2025-12-29T00:00:00.000Z', []),
      ];
      mockFetch
        .mockResolvedValueOnce(initialData)
        .mockResolvedValueOnce(emptyBatch);

      const { hasMore, fetchMore } = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      expect(hasMore.value).toBe(true);

      await fetchMore();

      expect(hasMore.value).toBe(false);
    });

    it('should not fetch if already loading more', async () => {
      mockAuthLoading.value = true;
      mockFetch.mockResolvedValueOnce([
        createDailyListen('2026-01-14T00:00:00.000Z', [
          createAlbumListen('album-1'),
        ]),
      ]);
      // Make second fetch slow
      mockFetch.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 1000)),
      );

      const { fetchMore } = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      // Start two fetches simultaneously
      const promise1 = fetchMore();
      const promise2 = fetchMore();

      await vi.runAllTimersAsync();
      await Promise.all([promise1, promise2]);

      // Should only have fetched twice (initial + one fetchMore)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not fetch if hasMore is false', async () => {
      mockAuthLoading.value = true;
      const initialData: DailyListens[] = [
        createDailyListen('2026-01-14T00:00:00.000Z', [
          createAlbumListen('album-1'),
        ]),
      ];
      const emptyBatch: DailyListens[] = [
        createDailyListen('2025-12-30T00:00:00.000Z', []),
      ];
      mockFetch
        .mockResolvedValueOnce(initialData)
        .mockResolvedValueOnce(emptyBatch);

      const { hasMore, fetchMore } = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      // First fetchMore sets hasMore to false
      await fetchMore();
      expect(hasMore.value).toBe(false);

      // Second fetchMore should not make API call
      await fetchMore();

      expect(mockFetch).toHaveBeenCalledTimes(2); // initial + one fetchMore
    });

    it('should handle fetchMore errors', async () => {
      mockAuthLoading.value = true;
      mockFetch.mockResolvedValueOnce([
        createDailyListen('2026-01-14T00:00:00.000Z', [
          createAlbumListen('album-1'),
        ]),
      ]);
      mockFetch.mockRejectedValueOnce(new Error('Fetch more failed'));

      const { error, fetchMore, loadingMore } = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      await fetchMore();

      expect(error.value?.message).toBe('Fetch more failed');
      expect(loadingMore.value).toBe(false);
    });
  });

  describe('refresh', () => {
    it('should clear data and refetch', async () => {
      mockAuthLoading.value = true;
      const initialData: DailyListens[] = [
        createDailyListen('2026-01-14T00:00:00.000Z', [
          createAlbumListen('album-1'),
        ]),
      ];
      const refreshedData: DailyListens[] = [
        createDailyListen('2026-01-15T00:00:00.000Z', [
          createAlbumListen('album-2'),
        ]),
      ];
      mockFetch
        .mockResolvedValueOnce(initialData)
        .mockResolvedValueOnce(refreshedData);

      const { data, refresh } = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      expect(data.value).toEqual(initialData);

      await refresh();

      expect(data.value).toEqual(refreshedData);
    });

    it('should reset hasMore to true on refresh', async () => {
      mockAuthLoading.value = true;
      const initialData: DailyListens[] = [
        createDailyListen('2026-01-14T00:00:00.000Z', [
          createAlbumListen('album-1'),
        ]),
      ];
      const emptyBatch: DailyListens[] = [
        createDailyListen('2025-12-30T00:00:00.000Z', []),
      ];
      mockFetch
        .mockResolvedValueOnce(initialData)
        .mockResolvedValueOnce(emptyBatch)
        .mockResolvedValueOnce(initialData);

      const { hasMore, fetchMore, refresh } = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      await fetchMore();
      expect(hasMore.value).toBe(false);

      await refresh();
      expect(hasMore.value).toBe(true);
    });
  });

  describe('updateFavoriteSongForDate', () => {
    it('should update favorite song for matching date', async () => {
      mockAuthLoading.value = true;
      const initialData: DailyListens[] = [
        createDailyListen('2026-01-14T00:00:00.000Z', [
          createAlbumListen('album-1'),
        ]),
      ];
      mockFetch.mockResolvedValueOnce(initialData);

      const { data, updateFavoriteSongForDate } = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      const favoriteSong = createFavoriteSong('album-1');

      updateFavoriteSongForDate('2026-01-14T00:00:00.000Z', favoriteSong);

      expect(data.value[0]?.favoriteSong).toEqual(favoriteSong);
    });

    it('should match date by prefix (ignoring time)', async () => {
      mockAuthLoading.value = true;
      const initialData: DailyListens[] = [
        createDailyListen('2026-01-14T00:00:00.000Z', [
          createAlbumListen('album-1'),
        ]),
      ];
      mockFetch.mockResolvedValueOnce(initialData);

      const { data, updateFavoriteSongForDate } = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      const favoriteSong = createFavoriteSong('album-1');

      // Use different time but same date
      updateFavoriteSongForDate('2026-01-14T15:30:00.000Z', favoriteSong);

      expect(data.value[0]?.favoriteSong).toEqual(favoriteSong);
    });

    it('should allow clearing favorite song', async () => {
      mockAuthLoading.value = true;
      const initialData: DailyListens[] = [
        {
          ...createDailyListen('2026-01-14T00:00:00.000Z', [
            createAlbumListen('album-1'),
          ]),
          favoriteSong: createFavoriteSong('album-1'),
        },
      ];
      mockFetch.mockResolvedValueOnce(initialData);

      const { data, updateFavoriteSongForDate } = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      updateFavoriteSongForDate('2026-01-14', null);

      expect(data.value[0]?.favoriteSong).toBeNull();
    });

    it('should not throw if date not found', async () => {
      mockAuthLoading.value = true;
      mockFetch.mockResolvedValueOnce([
        createDailyListen('2026-01-14T00:00:00.000Z', [
          createAlbumListen('album-1'),
        ]),
      ]);

      const { updateFavoriteSongForDate } = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      expect(() => {
        updateFavoriteSongForDate('2026-01-20', createFavoriteSong('album-1'));
      }).not.toThrow();
    });
  });

  describe('shared state', () => {
    it('should share state between multiple useListens calls', async () => {
      mockAuthLoading.value = true;
      mockFetch.mockResolvedValueOnce([
        createDailyListen('2026-01-14T00:00:00.000Z', [
          createAlbumListen('album-1'),
        ]),
      ]);

      const result1 = useListens();
      const result2 = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      // Both should reference the same data
      expect(result1.data.value).toBe(result2.data.value);
      expect(result1.data.value).toHaveLength(1);
    });
  });
});
