import { RecentlyPlayedService } from '../services/recentlyPlayed.service';
import { UserService } from '../services/user.service';

export default defineTask({
  meta: {
    name: 'processListens',
    description: 'Process users listens to track albums',
  },
  run: async () => {
    console.log('Running DB migration task...');

    const usersToProcess =
      await new UserService().fetchUsersForRecentlyPlayedProcessing();

    if (!usersToProcess.length) {
      return { result: 'No users to process' };
    }

    console.info(`Found ${usersToProcess.length} to process...`);

    const recentlyPlayedService = new RecentlyPlayedService();

    await Promise.all(
      usersToProcess.map((user) =>
        recentlyPlayedService.processTodaysListens(user),
      ),
    );

    return {
      result: `Successfully processed ${usersToProcess.length} user(s)`,
    };
  },
});
