import prisma, { type ExtendedPrismaClient } from '../clients/prisma';
import { createTaggedLogger } from '../utils/logger';

const logger = createTaggedLogger('Repository:PushSubscription');

export type CreatePushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  expirationTime?: Date | null;
};

export class PushSubscriptionRepository {
  constructor(private prismaClient: ExtendedPrismaClient = prisma) {}

  /**
   * Create or update a push subscription for a user
   * Upserts by endpoint to handle re-subscriptions
   */
  async upsertSubscription(
    userId: string,
    subscription: CreatePushSubscription,
  ) {
    logger.debug('Upserting push subscription', {
      userId,
      endpoint: `${subscription.endpoint.slice(0, 50)}...`,
    });

    try {
      const result = await this.prismaClient.pushSubscription.upsert({
        where: { endpoint: subscription.endpoint },
        update: {
          userId,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          expirationTime: subscription.expirationTime,
        },
        create: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          expirationTime: subscription.expirationTime,
        },
      });

      logger.debug('Successfully upserted push subscription', {
        userId,
        subscriptionId: result.id,
      });

      return result;
    } catch (error) {
      logger.error('Failed to upsert push subscription', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Get all push subscriptions for a user
   */
  async getSubscriptionsForUser(userId: string) {
    logger.debug('Fetching push subscriptions for user', { userId });

    try {
      const result = await this.prismaClient.pushSubscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      logger.debug('Successfully fetched push subscriptions', {
        userId,
        count: result.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch push subscriptions', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Delete a push subscription by endpoint
   */
  async deleteByEndpoint(endpoint: string) {
    logger.debug('Deleting push subscription by endpoint', {
      endpoint: `${endpoint.slice(0, 50)}...`,
    });

    try {
      const result = await this.prismaClient.pushSubscription.deleteMany({
        where: { endpoint },
      });

      logger.debug('Successfully deleted push subscription', {
        deletedCount: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to delete push subscription', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Delete a push subscription by ID
   */
  async deleteById(id: string) {
    logger.debug('Deleting push subscription by ID', { subscriptionId: id });

    try {
      const result = await this.prismaClient.pushSubscription.delete({
        where: { id },
      });

      logger.debug('Successfully deleted push subscription', {
        subscriptionId: id,
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete push subscription by ID', {
        subscriptionId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Get all users with push subscriptions
   * Used for sending bulk notifications
   */
  async getUserIdsWithSubscriptions() {
    logger.debug('Fetching user IDs with push subscriptions');

    try {
      const result = await this.prismaClient.pushSubscription.findMany({
        select: { userId: true },
        distinct: ['userId'],
      });

      const userIds = result.map((r) => r.userId);

      logger.debug('Successfully fetched user IDs with subscriptions', {
        count: userIds.length,
      });

      return userIds;
    } catch (error) {
      logger.error('Failed to fetch user IDs with subscriptions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
