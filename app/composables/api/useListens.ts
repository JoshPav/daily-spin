import { endOfDay, startOfDay, subDays } from 'date-fns';
import type {
  DailyListens,
  FavoriteSong,
  GetListensResponse,
} from '#shared/schema';
import { useAuth } from '../auth/useAuth';

// Fetch fewer days on mobile since fewer are visible
const MOBILE_BREAKPOINT = 768;
const INITIAL_DAYS = { mobile: 14, desktop: 21 };
const FETCH_MORE_DAYS = { mobile: 7, desktop: 14 };

const isMobile = () =>
  import.meta.client && window.innerWidth < MOBILE_BREAKPOINT;

const getInitialDays = () =>
  isMobile() ? INITIAL_DAYS.mobile : INITIAL_DAYS.desktop;

const getFetchMoreDays = () =>
  isMobile() ? FETCH_MORE_DAYS.mobile : FETCH_MORE_DAYS.desktop;

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

// Module-level singleton state (shared between all useListens instances)
// This replaces useState which caused test isolation issues
let listensData: Ref<DailyListens[]> | null = null;
let listensPending: Ref<boolean> | null = null;
let listensLoadingMore: Ref<boolean> | null = null;
let listensHasMore: Ref<boolean> | null = null;
let listensError: Ref<Error | null> | null = null;
let oldestLoadedDate: Ref<Date | null> | null = null;
let initialized: Ref<boolean> | null = null;

// Initialize or get existing refs (lazy singleton pattern)
const getState = () => {
  if (!listensData) {
    listensData = ref<DailyListens[]>([]);
    listensPending = ref<boolean>(true);
    listensLoadingMore = ref<boolean>(false);
    listensHasMore = ref<boolean>(true);
    listensError = ref<Error | null>(null);
    oldestLoadedDate = ref<Date | null>(null);
    initialized = ref<boolean>(false);
  }
  return {
    listensData: listensData!,
    listensPending: listensPending!,
    listensLoadingMore: listensLoadingMore!,
    listensHasMore: listensHasMore!,
    listensError: listensError!,
    oldestLoadedDate: oldestLoadedDate!,
    initialized: initialized!,
  };
};

// Reset function for test isolation
export const resetListensState = () => {
  listensData = null;
  listensPending = null;
  listensLoadingMore = null;
  listensHasMore = null;
  listensError = null;
  oldestLoadedDate = null;
  initialized = null;
};

export const useListens = (): UseListensReturn => {
  const state = getState();

  const updateFavoriteSongForDate = (
    date: string,
    favoriteSong: FavoriteSong | null,
  ) => {
    const datePrefix = date.split('T')[0] ?? date;
    const dailyListen = state.listensData.value.find((dl) =>
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
    state.listensPending.value = true;
    state.listensError.value = null;

    try {
      const today = new Date();
      const endDate = endOfDay(today);
      const startDate = startOfDay(subDays(today, getInitialDays()));

      const result = await fetchDateRange(startDate, endDate);

      state.listensData.value = result;
      state.oldestLoadedDate.value = startDate;

      // If no actual listens in initial fetch, there might still be older data
      // We'll determine hasMore when user tries to fetch more
      state.listensHasMore.value = true;
    } catch (e) {
      state.listensError.value =
        e instanceof Error ? e : new Error('Failed to fetch listens');
    } finally {
      state.listensPending.value = false;
    }
  };

  const fetchMore = async () => {
    if (
      state.listensLoadingMore.value ||
      !state.listensHasMore.value ||
      !state.oldestLoadedDate.value
    ) {
      return;
    }

    state.listensLoadingMore.value = true;

    try {
      // Fetch the next batch of older days
      const endDate = startOfDay(subDays(state.oldestLoadedDate.value, 1));
      const startDate = startOfDay(subDays(endDate, getFetchMoreDays()));

      const result = await fetchDateRange(startDate, endDate);

      // Prepend older data to the beginning
      state.listensData.value = [...result, ...state.listensData.value];
      state.oldestLoadedDate.value = startDate;

      // Stop fetching if we got a batch with no actual listens
      if (!hasActualListens(result)) {
        state.listensHasMore.value = false;
      }
    } catch (e) {
      state.listensError.value =
        e instanceof Error ? e : new Error('Failed to fetch more listens');
    } finally {
      state.listensLoadingMore.value = false;
    }
  };

  const refresh = async () => {
    state.listensData.value = [];
    state.oldestLoadedDate.value = null;
    state.listensHasMore.value = true;
    state.initialized.value = false;
    await fetchInitial();
  };

  // Wait for auth to be ready before fetching (only once per environment)
  const { loading: authLoading } = useAuth();

  // On client, reset initialization if server didn't complete the fetch
  // This handles SSR hydration where initialized=true but data wasn't loaded
  const needsClientInit =
    import.meta.client &&
    state.initialized.value &&
    state.listensPending.value &&
    state.listensData.value.length === 0;

  if (!state.initialized.value || needsClientInit) {
    // Set immediately to prevent race condition with multiple synchronous calls
    state.initialized.value = true;
    watch(
      authLoading,
      (isLoading) => {
        if (!isLoading) {
          fetchInitial();
        }
      },
      { immediate: true },
    );
  }

  return {
    data: state.listensData,
    pending: state.listensPending,
    loadingMore: state.listensLoadingMore,
    hasMore: state.listensHasMore,
    error: state.listensError,
    fetchMore,
    refresh,
    updateFavoriteSongForDate,
  };
};
