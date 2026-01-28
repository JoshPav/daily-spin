import webpush from 'web-push';
import type { PushNotificationPayload } from '~~/shared/schemas/push.schema';
import { PushSubscriptionRepository } from '../repositories/pushSubscription.repository';
import { createTaggedLogger } from '../utils/logger';

const logger = createTaggedLogger('Service:Push');

export class PushService {
  private isConfigured = false;

  constructor(private pushRepo = new PushSubscriptionRepository()) {
    this.configureVapid();
  }

  /**
   * Configure web-push with VAPID credentials from runtime config
   */
  private configureVapid() {
    const config = useRuntimeConfig();

    if (
      !config.vapidPrivateKey ||
      !config.vapidSubject ||
      !config.public.vapidPublicKey
    ) {
      logger.warn(
        'VAPID credentials not configured, push notifications disabled',
      );
      return;
    }

    try {
      webpush.setVapidDetails(
        config.vapidSubject as string,
        config.public.vapidPublicKey as string,
        config.vapidPrivateKey as string,
      );
      this.isConfigured = true;
      logger.info('VAPID credentials configured successfully');
    } catch (error) {
      logger.error('Failed to configure VAPID credentials', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send a push notification to all of a user's subscriptions
   * Returns the number of successful sends
   */
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<number> {
    if (!this.isConfigured) {
      logger.warn('Push service not configured, skipping notification', {
        userId,
      });
      return 0;
    }

    logger.debug('Sending push notification to user', {
      userId,
      title: payload.title,
    });

    const subscriptions = await this.pushRepo.getSubscriptionsForUser(userId);

    if (subscriptions.length === 0) {
      logger.debug('No push subscriptions found for user', { userId });
      return 0;
    }

    const payloadString = JSON.stringify(payload);
    let successCount = 0;

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payloadString,
          );
          successCount++;
          logger.debug('Push notification sent successfully', {
            userId,
            subscriptionId: subscription.id,
          });
        } catch (error) {
          // Handle expired subscriptions (410 Gone)
          if (
            error instanceof webpush.WebPushError &&
            error.statusCode === 410
          ) {
            logger.info('Subscription expired, removing', {
              userId,
              subscriptionId: subscription.id,
            });
            await this.pushRepo.deleteById(subscription.id);
          } else {
            logger.error('Failed to send push notification', {
              userId,
              subscriptionId: subscription.id,
              error: error instanceof Error ? error.message : 'Unknown error',
              statusCode:
                error instanceof webpush.WebPushError
                  ? error.statusCode
                  : undefined,
            });
          }
        }
      }),
    );

    logger.info('Push notifications sent', {
      userId,
      total: subscriptions.length,
      successful: successCount,
    });

    return successCount;
  }

  /**
   * Send a push notification to multiple users
   * Returns the total number of successful sends
   */
  async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload,
  ): Promise<number> {
    if (!this.isConfigured) {
      logger.warn('Push service not configured, skipping notifications');
      return 0;
    }

    logger.debug('Sending push notifications to multiple users', {
      userCount: userIds.length,
      title: payload.title,
    });

    const results = await Promise.all(
      userIds.map((userId) => this.sendToUser(userId, payload)),
    );

    const totalSuccess = results.reduce((sum, count) => sum + count, 0);

    logger.info('Bulk push notifications completed', {
      userCount: userIds.length,
      totalSuccessful: totalSuccess,
    });

    return totalSuccess;
  }
}
