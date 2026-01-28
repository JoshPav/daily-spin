import { endOfMonth, isAfter, min, startOfMonth } from 'date-fns';
import { computed, type Ref, ref, watch } from 'vue';
import type { Album, DailyListens, GetListensResponse } from '#shared/schema';
import { getPrimaryAlbum } from '~/utils/albums.utils';
import { toDateKey } from '~/utils/dateUtils';
import { useAuth } from '../../auth/useAuth';

export interface DayAlbum {
  /** Day of month (1-31) */
  day: number;
  /** Date string in YYYY-MM-DD format */
  date: string;
  /** The primary album for this day, or null if no listens */
  album: Album | null;
}

export interface MonthlyStats {
  /** Total number of albums listened to in the month */
  totalAlbums: number;
  /** Number of unique artists in the month */
  uniqueArtists: number;
}

export interface UseMonthlyListensReturn {
  /** Array of day/album pairs for the month */
  days: Ref<DayAlbum[]>;
  /** Monthly statistics */
  stats: Ref<MonthlyStats>;
  /** True during data fetch */
  loading: Ref<boolean>;
  /** Error if fetch failed */
  error: Ref<Error | null>;
  /** Whether this month has any listens */
  hasListens: Ref<boolean>;
}

/**
 * Check if a month is in the future (not yet started)
 */
function isFutureMonth(year: number, month: number): boolean {
  const requestedMonth = new Date(year, month - 1, 1);
  const currentMonthStart = startOfMonth(new Date());
  return isAfter(requestedMonth, currentMonthStart);
}

/**
 * Calculates monthly statistics from daily listens data
 */
function calculateStats(listens: DailyListens[]): MonthlyStats {
  const artistIds = new Set<string>();
  let totalAlbums = 0;

  for (const day of listens) {
    totalAlbums += day.albums.length;
    for (const albumListen of day.albums) {
      for (const artist of albumListen.album.artists) {
        artistIds.add(artist.spotifyId);
      }
    }
  }

  return {
    totalAlbums,
    uniqueArtists: artistIds.size,
  };
}

/**
 * Composable for fetching and processing a month's listening data.
 *
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12, where 1 = January)
 */
export const useMonthlyListens = (
  year: Ref<number>,
  month: Ref<number>,
): UseMonthlyListensReturn => {
  const days = ref<DayAlbum[]>([]);
  const stats = ref<MonthlyStats>({ totalAlbums: 0, uniqueArtists: 0 });
  const loading = ref(true);
  const error = ref<Error | null>(null);
  const hasListens = computed(() => stats.value.totalAlbums > 0);

  const fetchMonthListens = async () => {
    // Reset state
    error.value = null;
    loading.value = true;
    days.value = [];
    stats.value = { totalAlbums: 0, uniqueArtists: 0 };

    // Don't fetch for future months
    if (isFutureMonth(year.value, month.value)) {
      error.value = new Error('Cannot view summary for future months');
      loading.value = false;
      return;
    }

    try {
      const monthStart = new Date(year.value, month.value - 1, 1);
      const monthEnd = endOfMonth(monthStart);
      const today = new Date();

      // For current month, only fetch up to today
      const fetchEnd = min([monthEnd, today]);

      const result = await $fetch<GetListensResponse>('/api/listens', {
        query: {
          startDate: toDateKey(monthStart),
          endDate: toDateKey(fetchEnd),
        },
      });

      // Build a map of date -> DailyListens for quick lookup
      const listensByDate = new Map<string, DailyListens>();
      for (const day of result) {
        listensByDate.set(day.date, day);
      }

      // Show all days in the month (not just up to today)
      const daysInMonth = monthEnd.getDate();
      const dayAlbums: DayAlbum[] = [];

      for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        const date = new Date(year.value, month.value - 1, dayNum);
        const dateKey = toDateKey(date);
        const dailyListen = listensByDate.get(dateKey);

        dayAlbums.push({
          day: dayNum,
          date: dateKey,
          album: dailyListen ? getPrimaryAlbum(dailyListen) : null,
        });
      }

      days.value = dayAlbums;
      stats.value = calculateStats(result);
    } catch (e) {
      error.value =
        e instanceof Error ? e : new Error('Failed to fetch monthly listens');
    } finally {
      loading.value = false;
    }
  };

  // Wait for auth to be ready before fetching
  const { loading: authLoading } = useAuth();

  watch(
    [authLoading, year, month],
    ([isAuthLoading]) => {
      if (!isAuthLoading) {
        fetchMonthListens();
      }
    },
    { immediate: true },
  );

  return {
    days,
    stats,
    loading,
    error,
    hasListens,
  };
};
