import { endOfDay, startOfDay, subDays } from 'date-fns';
import type { DailyListens, GetListensResponse } from '#shared/schema';

const INITIAL_DAYS = 21; // 3 weeks
const FETCH_MORE_DAYS = 14; // 2 weeks per additional fetch

export interface UseListensReturn {
  /** Accumulated listening data (oldest to newest) */
  data: Ref<DailyListens[]>;
  /** Initial loading state */
  pending: Ref<boolean>;
  /** Loading more (older) data */
  loadingMore: Ref<boolean>;
  /** Whether there's more historical data to load */
  hasMore: Ref<boolean>;
  /** Error state */
  error: Ref<Error | null>;
  /** Fetch older data */
  fetchMore: () => Promise<void>;
  /** Refresh all data from the beginning */
  refresh: () => Promise<void>;
}

export const useListens = (): UseListensReturn => {
  const data = ref<DailyListens[]>([]);
  const pending = ref(true);
  const loadingMore = ref(false);
  const hasMore = ref(true);
  const error = ref<Error | null>(null);

  // Track the oldest date we've loaded
  const oldestLoadedDate = ref<Date | null>(null);

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
    pending.value = true;
    error.value = null;

    try {
      const today = new Date();
      const endDate = endOfDay(today);
      const startDate = startOfDay(subDays(today, INITIAL_DAYS));

      const result = await fetchDateRange(startDate, endDate);

      data.value = result;
      oldestLoadedDate.value = startDate;

      // If no actual listens in initial fetch, there might still be older data
      // We'll determine hasMore when user tries to fetch more
      hasMore.value = true;
    } catch (e) {
      error.value =
        e instanceof Error ? e : new Error('Failed to fetch listens');
    } finally {
      pending.value = false;
    }
  };

  const fetchMore = async () => {
    if (loadingMore.value || !hasMore.value || !oldestLoadedDate.value) {
      return;
    }

    loadingMore.value = true;

    try {
      // Fetch the next batch of older days
      const endDate = startOfDay(subDays(oldestLoadedDate.value, 1));
      const startDate = startOfDay(subDays(endDate, FETCH_MORE_DAYS));

      const result = await fetchDateRange(startDate, endDate);

      // Prepend older data to the beginning
      data.value = [...result, ...data.value];
      oldestLoadedDate.value = startDate;

      // Stop fetching if we got a batch with no actual listens
      if (!hasActualListens(result)) {
        hasMore.value = false;
      }
    } catch (e) {
      error.value =
        e instanceof Error ? e : new Error('Failed to fetch more listens');
    } finally {
      loadingMore.value = false;
    }
  };

  const refresh = async () => {
    data.value = [];
    oldestLoadedDate.value = null;
    hasMore.value = true;
    await fetchInitial();
  };

  // Fetch initial data
  fetchInitial();

  return {
    data: data as Ref<DailyListens[]>,
    pending: pending as Ref<boolean>,
    loadingMore: loadingMore as Ref<boolean>,
    hasMore: hasMore as Ref<boolean>,
    error: error as Ref<Error | null>,
    fetchMore,
    refresh,
  };
};
