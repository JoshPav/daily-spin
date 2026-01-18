import { endOfDay, startOfDay, subDays } from 'date-fns';
import type {
  DailyListens,
  FavoriteSong,
  GetListensResponse,
} from '#shared/schema';
import { useAuth } from '../auth/useAuth';

const INITIAL_DAYS = 21;
const FETCH_MORE_DAYS = 14;

// Shared state across all uses of useListens
const listensData = ref<DailyListens[]>([]);
const listensPending = ref(true);
const listensLoadingMore = ref(false);
const listensHasMore = ref(true);
const listensError = ref<Error | null>(null);
const oldestLoadedDate = ref<Date | null>(null);
let initialized = false;

export interface UseListensReturn {
  data: Ref<DailyListens[]>;
  pending: Ref<boolean>;
  loadingMore: Ref<boolean>;
  hasMore: Ref<boolean>;
  error: Ref<Error | null>;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updateFavoriteSongForDate: (
    date: string,
    favoriteSong: FavoriteSong | null,
  ) => void;
}

export const useListens = (): UseListensReturn => {
  const updateFavoriteSongForDate = (
    date: string,
    favoriteSong: FavoriteSong | null,
  ) => {
    const datePrefix = date.split('T')[0] ?? date;
    const dailyListen = listensData.value.find((dl) =>
      dl.date.startsWith(datePrefix),
    );
    if (dailyListen) {
      dailyListen.favoriteSong = favoriteSong;
    }
  };

  const fetchDateRange = async (
    startDate: Date,
    endDate: Date,
  ): Promise<DailyListens[]> => {
    return await $fetch<GetListensResponse>('/api/listens', {
      query: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  };

  // Check if a response has any actual listens (not just empty days)
  const hasActualListens = (listens: DailyListens[]): boolean => {
    return listens.some((day) => day.albums.length > 0);
  };

  const fetchInitial = async () => {
    listensPending.value = true;
    listensError.value = null;

    try {
      const today = new Date();
      const endDate = endOfDay(today);
      const startDate = startOfDay(subDays(today, INITIAL_DAYS));

      const result = await fetchDateRange(startDate, endDate);

      listensData.value = result;
      oldestLoadedDate.value = startDate;

      // If no actual listens in initial fetch, there might still be older data
      // We'll determine hasMore when user tries to fetch more
      listensHasMore.value = true;
    } catch (e) {
      listensError.value =
        e instanceof Error ? e : new Error('Failed to fetch listens');
    } finally {
      listensPending.value = false;
    }
  };

  const fetchMore = async () => {
    if (
      listensLoadingMore.value ||
      !listensHasMore.value ||
      !oldestLoadedDate.value
    ) {
      return;
    }

    listensLoadingMore.value = true;

    try {
      // Fetch the next batch of older days
      const endDate = startOfDay(subDays(oldestLoadedDate.value, 1));
      const startDate = startOfDay(subDays(endDate, FETCH_MORE_DAYS));

      const result = await fetchDateRange(startDate, endDate);

      // Prepend older data to the beginning
      listensData.value = [...result, ...listensData.value];
      oldestLoadedDate.value = startDate;

      // Stop fetching if we got a batch with no actual listens
      if (!hasActualListens(result)) {
        listensHasMore.value = false;
      }
    } catch (e) {
      listensError.value =
        e instanceof Error ? e : new Error('Failed to fetch more listens');
    } finally {
      listensLoadingMore.value = false;
    }
  };

  const refresh = async () => {
    listensData.value = [];
    oldestLoadedDate.value = null;
    listensHasMore.value = true;
    initialized = false;
    await fetchInitial();
  };

  // Wait for auth to be ready before fetching (only once)
  const { loading: authLoading } = useAuth();

  if (!initialized) {
    watch(
      authLoading,
      (isLoading) => {
        if (!isLoading && !initialized) {
          initialized = true;
          fetchInitial();
        }
      },
      { immediate: true },
    );
  }

  return {
    data: listensData,
    pending: listensPending,
    loadingMore: listensLoadingMore,
    hasMore: listensHasMore,
    error: listensError,
    fetchMore,
    refresh,
    updateFavoriteSongForDate,
  };
};
