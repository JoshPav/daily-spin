import { addDays, startOfDay, subDays } from 'date-fns';
import { computed, ref, triggerRef } from 'vue';
import type { DailyListens, FutureListenItem } from '#shared/schema';
import type { FetchAmounts } from '~/constants/fetchConfig';
import { toDateKey } from '~/utils/dateUtils';
import { useListens } from './useListens';

type DeviceType = 'mobile' | 'desktop';

type DashboardFetchConfig = {
  past: FetchAmounts;
  future: FetchAmounts;
};

const FETCH_CONFIG: Record<DeviceType, DashboardFetchConfig> = {
  mobile: {
    past: { initial: 14, fetchMore: 7 },
    future: { initial: 7, fetchMore: 7 },
  },
  desktop: {
    past: { initial: 21, fetchMore: 14 },
    future: { initial: 7, fetchMore: 7 },
  },
};

/** Data for a past/today date */
export type PastDayData = {
  type: 'past';
  listens?: DailyListens;
};

/** Data for a future date */
export type FutureDayData = {
  type: 'future';
  futureListen?: FutureListenItem;
};

/** Discriminated union for day data. undefined = still loading */
export type DayData = PastDayData | FutureDayData;

/**
 * Unified composable for dashboard data.
 *
 * Returns:
 * - displayDates: Array of YYYY-MM-DD date keys to render
 * - getDataForDate: Function to get data for a date (undefined = loading)
 * - updateDay: Function to update data for a date (DailyListens or FutureListenItem)
 * - loading/error: Data fetching state
 * - listensHistory: { hasMore, fetchMore } for infinite scroll
 */
export const useDashboardData = () => {
  const device = useDevice();
  const config = computed(() => {
    const deviceType = device.isMobile ? 'mobile' : 'desktop';
    return FETCH_CONFIG[deviceType];
  });

  const {
    listensByDate,
    loading,
    hasMore,
    error,
    fetchMore: fetchMoreListens,
  } = useListens(config.value.past);
  const {
    futureListensByDate,
    loading: futureListensLoading,
    hasMore: futureHasMore,
    fetchMore: fetchMoreFuture,
  } = useFutureListens(config.value.future);

  // Track how many times we've fetched more to expand displayDates
  const pastFetchCount = ref(0);

  // Cache "today" to avoid timezone issues between server/client or recomputations
  const today = startOfDay(new Date());

  /**
   * Array of YYYY-MM-DD date keys to display, in chronological order.
   * Expands as more past data is fetched.
   */
  const displayDates = computed<string[]>(() => {
    const dates: string[] = [];

    // Calculate total past days based on initial + fetchMore batches
    const totalPastDays =
      config.value.past.initial +
      pastFetchCount.value * config.value.past.fetchMore;

    // Past dates (oldest first)
    for (let i = totalPastDays; i >= 1; i--) {
      dates.push(toDateKey(subDays(today, i)));
    }

    // Today
    dates.push(toDateKey(today));

    // Future dates
    for (let i = 1; i <= config.value.future.initial; i++) {
      dates.push(toDateKey(addDays(today, i)));
    }

    return dates;
  });

  // Cache today's key for consistent comparisons
  const todayKey = toDateKey(today);

  /**
   * Get data for a specific date.
   * Missing listens/futureListen indicates loading or empty.
   */
  const getDataForDate = (dateKey: string): DayData => {
    const pastData = listensByDate.value.get(dateKey);
    const futureData = futureListensByDate.value.get(dateKey);

    // If we have actual listens, show as past
    if (pastData && pastData.albums.length > 0) {
      return { type: 'past', listens: pastData };
    }

    // If there's a future listen scheduled, show as future
    if (futureData) {
      return { type: 'future', futureListen: futureData };
    }

    // Today with no albums - show as future to allow adding via the + button
    if (dateKey === todayKey) {
      return { type: 'future' };
    }

    // Past dates with no data
    if (dateKey < todayKey) {
      return { type: 'past', listens: pastData };
    }

    // Future dates
    return { type: 'future' };
  };

  /** Update data for a specific date */
  function updateDay(date: string, data: DailyListens): void;
  function updateDay(date: string, data: FutureListenItem): void;
  function updateDay(
    date: string,
    data: DailyListens | FutureListenItem,
  ): void {
    const dateKey = toDateKey(date);

    if ('albums' in data) {
      listensByDate.value.set(dateKey, data);
      triggerRef(listensByDate);
    } else {
      futureListensByDate.value.set(dateKey, data);
      triggerRef(futureListensByDate);
    }
  }

  /** Fetch more past data and expand the date range */
  const fetchMore = async () => {
    pastFetchCount.value++; // Expand dates first to show skeletons
    await fetchMoreListens();
  };

  return {
    displayDates,
    getDataForDate,
    updateDay,
    loading,
    futureListensLoading,
    error,
    listensHistory: {
      hasMore,
      fetchMore,
    },
    futureListens: {
      hasMore: futureHasMore,
      fetchMore: fetchMoreFuture,
    },
  };
};
