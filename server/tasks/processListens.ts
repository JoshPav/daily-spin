import { RecentlyPlayedService } from '../services/recentlyPlayed.service';
import { UserService } from '../services/user.service';
import { createTaggedLogger } from '../utils/logger';

const logger = createTaggedLogger('Task:ProcessListens');

export default defineTask({
  meta: {
    name: 'processListens',
    description: 'Process users listens to track albums',
  },
  run: async () => {
    const startTime = Date.now();

    logger.info('Starting scheduled task');

    try {
      const usersToProcess =
        await new UserService().fetchUsersForRecentlyPlayedProcessing();

      if (!usersToProcess.length) {
        const duration = Date.now() - startTime;
        logger.info('Task completed - no users to process', {
          duration: `${duration}ms`,
        });
        return { result: 'No users to process', duration };
      }

      logger.info('Processing users', {
        userCount: usersToProcess.length,
      });

      const recentlyPlayedService = new RecentlyPlayedService();

      // Track results per user
      const results = await Promise.allSettled(
        usersToProcess.map(async (user) => {
          const userStartTime = Date.now();
          try {
            await recentlyPlayedService.processTodaysListens(user);
            const userDuration = Date.now() - userStartTime;

            logger.debug('Successfully processed user', {
              userId: user.id,
              duration: `${userDuration}ms`,
            });

            return { userId: user.id, success: true };
          } catch (error) {
            const userDuration = Date.now() - userStartTime;

            logger.error('Failed to process user', {
              userId: user.id,
              duration: `${userDuration}ms`,
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            });

            return { userId: user.id, success: false, error };
          }
        }),
      );

      // Count successes and failures
      const successful = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success,
      ).length;
      const failed = results.filter(
        (r) =>
          r.status === 'rejected' ||
          (r.status === 'fulfilled' && !r.value.success),
      ).length;

      const duration = Date.now() - startTime;

      logger.info('Task completed', {
        totalUsers: usersToProcess.length,
        successful,
        failed,
        duration: `${duration}ms`,
      });

      return {
        result: `Processed ${usersToProcess.length} user(s): ${successful} successful, ${failed} failed`,
        successful,
        failed,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Task failed', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  },
});
