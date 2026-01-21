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

// Mock useDevice (auto-imported by @nuxtjs/device)
vi.stubGlobal('useDevice', () => ({
  isMobile: false,
}));

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
import { toDateKey } from '~/utils/dateUtils';
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

  describe('toDateKey', () => {
    it('should convert Date to YYYY-MM-DD format', () => {
      const date = new Date('2026-01-15T14:30:00.000Z');
      expect(toDateKey(date)).toBe('2026-01-15');
    });

    it('should extract date from ISO string', () => {
      expect(toDateKey('2026-01-15T14:30:00.000Z')).toBe('2026-01-15');
    });

    it('should pass through YYYY-MM-DD string unchanged', () => {
      expect(toDateKey('2026-01-15')).toBe('2026-01-15');
    });
  });

  describe('initial state', () => {
    it('should initialize with empty Map', () => {
      mockAuthLoading.value = true; // Prevent auto-fetch
      const { listensByDate } = useListens();
      expect(listensByDate.value.size).toBe(0);
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

      const { listensByDate, pending } = useListens();

      // Simulate auth finishing loading
      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      expect(mockFetch).toHaveBeenCalledWith('/api/listens', {
        query: {
          startDate: expect.stringContaining('2025-12-25'),
          endDate: expect.stringContaining('2026-01-15'),
        },
      });
      expect(listensByDate.value.size).toBe(2);
      expect(listensByDate.value.get('2026-01-14')).toEqual(mockData[0]);
      expect(listensByDate.value.get('2026-01-15')).toEqual(mockData[1]);
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
  });

  describe('fetchMore', () => {
    it('should fetch older data and merge into Map', async () => {
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

      const { listensByDate, fetchMore } = useListens();

      // Wait for initial fetch
      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      // Fetch more
      await fetchMore();

      expect(listensByDate.value.size).toBe(2);
      expect(listensByDate.value.get('2026-01-14')).toEqual(initialData[0]);
      expect(listensByDate.value.get('2025-12-30')).toEqual(olderData[0]);
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
    it('should clear Map and refetch', async () => {
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

      const { listensByDate, refresh } = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      expect(listensByDate.value.get('2026-01-14')).toEqual(initialData[0]);

      await refresh();

      expect(listensByDate.value.size).toBe(1);
      expect(listensByDate.value.get('2026-01-15')).toEqual(refreshedData[0]);
      expect(listensByDate.value.has('2026-01-14')).toBe(false);
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

      const { listensByDate, updateFavoriteSongForDate } = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      const favoriteSong = createFavoriteSong('album-1');

      updateFavoriteSongForDate('2026-01-14T00:00:00.000Z', favoriteSong);

      expect(listensByDate.value.get('2026-01-14')?.favoriteSong).toEqual(
        favoriteSong,
      );
    });

    it('should match date by prefix (ignoring time)', async () => {
      mockAuthLoading.value = true;
      const initialData: DailyListens[] = [
        createDailyListen('2026-01-14T00:00:00.000Z', [
          createAlbumListen('album-1'),
        ]),
      ];
      mockFetch.mockResolvedValueOnce(initialData);

      const { listensByDate, updateFavoriteSongForDate } = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      const favoriteSong = createFavoriteSong('album-1');

      // Use different time but same date
      updateFavoriteSongForDate('2026-01-14T15:30:00.000Z', favoriteSong);

      expect(listensByDate.value.get('2026-01-14')?.favoriteSong).toEqual(
        favoriteSong,
      );
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

      const { listensByDate, updateFavoriteSongForDate } = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      updateFavoriteSongForDate('2026-01-14', null);

      expect(listensByDate.value.get('2026-01-14')?.favoriteSong).toBeNull();
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

    it('should trigger reactivity when updating favorite song', async () => {
      mockAuthLoading.value = true;
      const initialData: DailyListens[] = [
        createDailyListen('2026-01-14T00:00:00.000Z', [
          createAlbumListen('album-1'),
        ]),
      ];
      mockFetch.mockResolvedValueOnce(initialData);

      const { listensByDate, updateFavoriteSongForDate } = useListens();

      mockAuthLoading.value = false;
      await vi.runAllTimersAsync();

      const originalMap = listensByDate.value;
      const favoriteSong = createFavoriteSong('album-1');

      updateFavoriteSongForDate('2026-01-14', favoriteSong);

      // The Map reference should change to trigger reactivity
      expect(listensByDate.value).not.toBe(originalMap);
    });
  });
});
