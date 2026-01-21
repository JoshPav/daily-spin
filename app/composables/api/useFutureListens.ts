import type { Ref } from 'vue';
import { ref, watch } from 'vue';
import type {
  FutureListenItem,
  GetFutureListensResponse,
} from '#shared/schema';
import { useAuth } from '../auth/useAuth';

export interface UseFutureListensReturn {
  futureListensByDate: Ref<Map<string, FutureListenItem>>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  refresh: () => Promise<void>;
}

export const useFutureListens = (): UseFutureListensReturn => {
  const futureListensByDate = ref<Map<string, FutureListenItem>>(new Map());
  const loading = ref(true);
  const error = ref<Error | null>(null);
  const initialized = ref(false);

  const fetchFutureListens = async () => {
    loading.value = true;
    error.value = null;

    try {
      const data = await $fetch<GetFutureListensResponse>(
        '/api/future-listens',
      );

      const map = new Map<string, FutureListenItem>();
      if (data?.items) {
        for (const item of data.items) {
          map.set(item.date, item);
        }
      }
      futureListensByDate.value = map;
    } catch (e) {
      error.value =
        e instanceof Error ? e : new Error('Failed to fetch future listens');
    } finally {
      loading.value = false;
    }
  };

  const refresh = async () => {
    await fetchFutureListens();
  };

  // Wait for auth to be ready before fetching
  const { loading: authLoading } = useAuth();

  watch(
    authLoading,
    (isLoading) => {
      if (!isLoading && !initialized.value) {
        initialized.value = true;
        fetchFutureListens();
      }
    },
    { immediate: true },
  );

  return {
    futureListensByDate,
    loading,
    error,
    refresh,
  };
};
