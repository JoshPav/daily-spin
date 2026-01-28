import { tz } from '@date-fns/tz';
import { startOfDay } from 'date-fns';
import { DailyListenRepository } from '../repositories/dailyListen.repository';
import { PushService } from '../services/push.service';
import { createTaggedLogger } from '../utils/logger';

const logger = createTaggedLogger('Task:SendFavoriteSongReminders');

export const sendFavoriteSongReminders = async () => {
  const startTime = Date.now();

  logger.info('Starting scheduled task');

  try {
    const today = startOfDay(new Date(), { in: tz('UTC') });
    const dailyListenRepo = new DailyListenRepository();
    const pushService = new PushService();

    const usersWithoutFavorite =
      await dailyListenRepo.getUsersWithoutFavoriteSong(today);

    if (!usersWithoutFavorite.length) {
      const duration = Date.now() - startTime;
      logger.info('Task completed - no users to remind', {
        duration: `${duration}ms`,
      });
      return { result: 'No users to remind', duration };
    }

    logger.info('Sending favorite song reminders', {
      userCount: usersWithoutFavorite.length,
    });

    const results = await Promise.allSettled(
      usersWithoutFavorite.map(async ({ userId, albumCount }) => {
        try {
          const albumText =
            albumCount === 1 ? '1 album' : `${albumCount} albums`;
          await pushService.sendToUser(userId, {
            title: 'Pick Your Song of the Day',
            body: `You listened to ${albumText} today. Choose your favorite track!`,
            data: { type: 'favorite-song', url: '/dashboard' },
            actions: [{ action: 'view', title: 'Choose' }],
          });
          return { userId, success: true };
        } catch (error) {
          logger.error('Failed to send reminder to user', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return { userId, success: false };
        }
      }),
    );

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
      totalUsers: usersWithoutFavorite.length,
      successful,
      failed,
      duration: `${duration}ms`,
    });

    return {
      result: `Sent ${successful} reminder(s), ${failed} failed`,
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
};

export default defineTask({
  meta: {
    name: 'sendFavoriteSongReminders',
    description:
      'Send push notifications to remind users to pick their song of the day',
  },
  run: sendFavoriteSongReminders,
});
