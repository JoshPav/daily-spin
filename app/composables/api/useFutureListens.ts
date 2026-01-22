import { addDays, startOfDay } from 'date-fns';
import type { Ref } from 'vue';
import { ref, watch } from 'vue';
import type {
  FutureListenItem,
  GetFutureListensResponse,
} from '#shared/schema';
import type { FetchAmounts } from '~/constants/fetchConfig';
import { toDateKey } from '~/utils/dateUtils';
import { useAuth } from '../auth/useAuth';

export interface UseFutureListensReturn {
  futureListensByDate: Ref<Map<string, FutureListenItem>>;
  loading: Ref<boolean>;
  hasMore: Ref<boolean>;
  error: Ref<Error | null>;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useFutureListens = (
  fetchAmounts: FetchAmounts,
): UseFutureListensReturn => {
  const futureListensByDate = ref<Map<string, FutureListenItem>>(new Map());
  const loading = ref(true);
  const hasMore = ref(true);
  const error = ref<Error | null>(null);
  const latestLoadedDate = ref<Date | null>(null);
  const initialized = ref(false);

  const fetchDateRange = async (
    startDate: Date,
    endDate: Date,
  ): Promise<GetFutureListensResponse> => {
    return await $fetch<GetFutureListensResponse>('/api/future-listens', {
      query: {
        startDate: toDateKey(startDate),
        endDate: toDateKey(endDate),
      },
    });
  };

  /** Merge date-keyed object into the Map, filtering out nulls */
  const mergeItemsToMap = (
    items: Record<string, FutureListenItem | null>,
  ): void => {
    const newMap = new Map(futureListensByDate.value);
    for (const [dateKey, item] of Object.entries(items)) {
      if (item !== null) {
        newMap.set(dateKey, item);
      }
    }
    futureListensByDate.value = newMap;
  };

  const fetchInitial = async () => {
    error.value = null;
    loading.value = true;

    try {
      const today = startOfDay(new Date());
      const startDate = today;
      const endDate = addDays(today, fetchAmounts.initial);

      const result = await fetchDateRange(startDate, endDate);

      mergeItemsToMap(result.items);
      latestLoadedDate.value = endDate;
      hasMore.value = result.pagination.hasMore;
    } catch (e) {
      error.value =
        e instanceof Error ? e : new Error('Failed to fetch future listens');
    } finally {
      loading.value = false;
    }
  };

  const fetchMore = async () => {
    if (loading.value || !hasMore.value || !latestLoadedDate.value) {
      return;
    }

    loading.value = true;

    try {
      // Fetch the next batch of future days
      const startDate = addDays(latestLoadedDate.value, 1);
      const endDate = addDays(startDate, fetchAmounts.fetchMore);

      const result = await fetchDateRange(startDate, endDate);

      mergeItemsToMap(result.items);
      latestLoadedDate.value = endDate;
      hasMore.value = result.pagination.hasMore;
    } catch (e) {
      error.value =
        e instanceof Error
          ? e
          : new Error('Failed to fetch more future listens');
    } finally {
      loading.value = false;
    }
  };

  const refresh = async () => {
    futureListensByDate.value = new Map();
    latestLoadedDate.value = null;
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
    futureListensByDate,
    loading,
    hasMore,
    error,
    fetchMore,
    refresh,
  };
};
