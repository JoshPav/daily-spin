import { BacklogService } from '../services/backlog.service';
import { UserService } from '../services/user.service';

export default defineTask({
  meta: {
    name: 'scheduleBacklogListens',
    description: 'Automatically schedule backlog albums to future listens',
  },
  run: async () => {
    const userService = new UserService();
    const users = await userService.fetchUsersForRecentlyPlayedProcessing();

    if (!users.length) {
      return { result: 'No users to process' };
    }

    const backlogService = new BacklogService();
    const results = {
      success: 0,
      failed: 0,
      totalScheduled: 0,
      errors: [] as Array<{ userId: string; error: string }>,
    };

    for (const user of users) {
      try {
        const result = await backlogService.scheduleBacklogToFutureListens(
          user.id,
          7,
        );
        results.success++;
        results.totalScheduled += result.scheduled.length;
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`Failed to schedule for user ${user.id}:`, error);
      }
    }

    console.info('Backlog scheduling completed', {
      successCount: results.success,
      failedCount: results.failed,
      totalScheduled: results.totalScheduled,
    });

    return {
      result: `Successfully processed ${results.success} user(s), scheduled ${results.totalScheduled} album(s), ${results.failed} failed`,
    };
  },
});
