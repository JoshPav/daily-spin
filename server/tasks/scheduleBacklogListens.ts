import { BacklogService } from '../services/backlog.service';
import { UserService } from '../services/user.service';
import { createTaggedLogger } from '../utils/logger';

const logger = createTaggedLogger('Task:ScheduleBacklogListens');

export const scheduleBacklogListens = async () => {
  const startTime = Date.now();

  logger.info('Starting scheduled task');

  try {
    const userService = new UserService();
    const users = await userService.fetchUsersForRecentlyPlayedProcessing();

    if (!users.length) {
      const duration = Date.now() - startTime;
      logger.info('Task completed - no users to process', {
        duration: `${duration}ms`,
      });
      return { result: 'No users to process', duration };
    }

    logger.info('Processing users', {
      userCount: users.length,
    });

    const backlogService = new BacklogService();
    const results = {
      success: 0,
      failed: 0,
      totalScheduled: 0,
      errors: [] as Array<{ userId: string; error: string }>,
    };

    for (const user of users) {
      const userStartTime = Date.now();
      try {
        const result = await backlogService.scheduleBacklogToFutureListens(
          user.id,
          7,
        );
        const userDuration = Date.now() - userStartTime;

        results.success++;
        results.totalScheduled += result.scheduled.length;

        logger.debug('Successfully scheduled backlog for user', {
          userId: user.id,
          scheduled: result.scheduled.length,
          duration: `${userDuration}ms`,
        });
      } catch (error) {
        const userDuration = Date.now() - userStartTime;

        results.failed++;
        results.errors.push({
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        logger.error('Failed to schedule backlog for user', {
          userId: user.id,
          duration: `${userDuration}ms`,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Task completed', {
      totalUsers: users.length,
      successful: results.success,
      failed: results.failed,
      totalScheduled: results.totalScheduled,
      duration: `${duration}ms`,
    });

    return {
      result: `Processed ${users.length} user(s): ${results.success} successful, scheduled ${results.totalScheduled} album(s), ${results.failed} failed`,
      successful: results.success,
      failed: results.failed,
      totalScheduled: results.totalScheduled,
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
};

export default defineTask({
  meta: {
    name: 'scheduleBacklogListens',
    description: 'Automatically schedule backlog albums to future listens',
  },
  run: scheduleBacklogListens,
});
