import type {
  DailyAlbumListen,
  DailyListens,
  GetListensResponse,
} from '~~/shared/schema';
import { dailyAlbumListen } from './api.factory';

/**
 * Generate a list of daily listens for testing dashboard display.
 * Creates entries from startDate to endDate with optional albums.
 */
export const generateDailyListens = (options: {
  startDate: Date;
  endDate: Date;
  todayAlbums?: DailyAlbumListen[];
  includeRandomAlbums?: boolean;
}): GetListensResponse => {
  const {
    startDate,
    endDate,
    todayAlbums,
    includeRandomAlbums = true,
  } = options;
  const listens: DailyListens[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    const isToday = current.getTime() === today.getTime();
    const isFuture = current > today;

    // Only include past and today dates
    if (!isFuture) {
      let albums: DailyAlbumListen[] = [];

      if (isToday && todayAlbums) {
        albums = todayAlbums;
      } else if (includeRandomAlbums && Math.random() > 0.3) {
        // 70% chance of having an album for past days
        albums = [dailyAlbumListen()];
      }

      listens.push({
        date: current.toISOString(),
        albums,
        favoriteSong: null,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return listens;
};

/**
 * Generate daily listens for the current month up to today.
 */
export const generateCurrentMonthListens = (
  todayAlbums?: DailyAlbumListen[],
): GetListensResponse => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return generateDailyListens({
    startDate: startOfMonth,
    endDate: today,
    todayAlbums,
  });
};

/**
 * Create a single day's listen data.
 */
export const createDayListens = (
  date: Date,
  albums: DailyAlbumListen[] = [],
): DailyListens => ({
  date: date.toISOString(),
  albums,
  favoriteSong: null,
});

/**
 * Create a today listen entry with specific album data.
 */
export const createTodayListen = (albums: DailyAlbumListen[]): DailyListens => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return createDayListens(today, albums);
};

// Re-export commonly used factories from api.factory
export { album, artist, dailyAlbumListen, listenMetadata } from './api.factory';
