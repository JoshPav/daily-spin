import { RecentlyPlayedService } from '../services/recentlyPlayed.service';

export default defineEventHandler(async () => {
  const recentlyPlayedService = new RecentlyPlayedService();

  const userId = process.env.USER_ID;

  if (!userId) {
    return;
  }

  await recentlyPlayedService.processTodaysListens(userId);
});
