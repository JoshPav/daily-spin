import { endOfDay, startOfDay, subDays } from 'date-fns';
import { type Ref, ref, watch } from 'vue';
import type { DailyListens, GetListensResponse } from '#shared/schema';
import { toDateKey } from '~/utils/dateUtils';
import { useAuth } from '../auth/useAuth';

export type FetchAmounts = {
  initial: number;
  fetchMore: number;
};

export interface UseListensReturn {
  /** Map of date keys (YYYY-MM-DD) to DailyListens data */
  listensByDate: Ref<Map<string, DailyListens>>;
  /** True during any data fetch (initial or loading more) */
  loading: Ref<boolean>;
  /** True if there's more historical data to fetch */
  hasMore: Ref<boolean>;
  /** Any error that occurred during fetching */
  error: Ref<Error | null>;
  /** Fetch older historical data */
  fetchMore: () => Promise<void>;
  /** Refresh all data from scratch */
  refresh: () => Promise<void>;
}

export const useListens = (fetchAmounts: FetchAmounts): UseListensReturn => {
  const listensByDate = ref<Map<string, DailyListens>>(new Map());
  const loading = ref(true);
  const hasMore = ref(true);
  const error = ref<Error | null>(null);
  const oldestLoadedDate = ref<Date | null>(null);
  const initialized = ref(false);

  const fetchDateRange = async (
    startDate: Date,
    endDate: Date,
  ): Promise<DailyListens[]> => {
    return await $fetch<GetListensResponse>('/api/listens', {
      query: {
        startDate: toDateKey(startDate),
        endDate: toDateKey(endDate),
      },
    });
  };

  // Check if a response has any actual listens (not just empty days)
  const hasActualListens = (listens: DailyListens[]): boolean => {
    return listens.some((day) => day.albums.length > 0);
  };

  /** Merge an array of DailyListens into the Map */
  const mergeListensToMap = (listens: DailyListens[]): void => {
    const newMap = new Map(listensByDate.value);
    for (const day of listens) {
      const key = toDateKey(day.date);
      newMap.set(key, day);
    }
    listensByDate.value = newMap;
  };

  const fetchInitial = async () => {
    error.value = null;
    loading.value = true;

    try {
      const today = new Date();
      const endDate = endOfDay(today);
      const startDate = startOfDay(subDays(today, fetchAmounts.initial));

      const result = await fetchDateRange(startDate, endDate);

      mergeListensToMap(result);
      oldestLoadedDate.value = startDate;

      // If no actual listens in initial fetch, there might still be older data
      // We'll determine hasMore when user tries to fetch more
      hasMore.value = true;
    } catch (e) {
      error.value =
        e instanceof Error ? e : new Error('Failed to fetch listens');
    } finally {
      loading.value = false;
    }
  };

  const fetchMore = async () => {
    if (loading.value || !hasMore.value || !oldestLoadedDate.value) {
      return;
    }

    loading.value = true;

    try {
      // Fetch the next batch of older days
      const endDate = startOfDay(subDays(oldestLoadedDate.value, 1));
      const startDate = startOfDay(subDays(endDate, fetchAmounts.fetchMore));

      const result = await fetchDateRange(startDate, endDate);

      mergeListensToMap(result);
      oldestLoadedDate.value = startDate;

      // Stop fetching if we got a batch with no actual listens
      if (!hasActualListens(result)) {
        hasMore.value = false;
      }
    } catch (e) {
      error.value =
        e instanceof Error ? e : new Error('Failed to fetch more listens');
    } finally {
      loading.value = false;
    }
  };

  const refresh = async () => {
    listensByDate.value = new Map();
    oldestLoadedDate.value = null;
    hasMore.value = true;
    initialized.value = false;
    await fetchInitial();
  };

  // Wait for auth to be ready before fetching
  const { loading: authLoading } = useAuth();

  watch(
    authLoading,
    (isLoading) => {
      if (!isLoading && !initialized.value) {
        initialized.value = true;
        fetchInitial();
      }
    },
    { immediate: true },
  );

  return {
    listensByDate,
    loading,
    hasMore,
    error,
    fetchMore,
    refresh,
  };
};
