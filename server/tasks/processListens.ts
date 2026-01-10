import { RecentlyPlayedService } from '../services/recentlyPlayed.service';

// export default defineEventHandler(async () => {
//   const recentlyPlayedService = new RecentlyPlayedService();

//   const userId = process.env.USER_ID;

//   if (!userId) {
//     return;
//   }

//   await recentlyPlayedService.processTodaysListens(userId);
// });

export default defineTask({
  meta: {
    name: 'processListens',
    description: 'Process users listens to track albums',
  },
  run: async () => {
    console.log('Running DB migration task...');

    const recentlyPlayedService = new RecentlyPlayedService();

    const userId = process.env.USER_ID;

    if (!userId) {
      return { result: 'no-op' };
    }

    await recentlyPlayedService.processTodaysListens(userId);

    return { result: 'Finished processing' };
  },
});
