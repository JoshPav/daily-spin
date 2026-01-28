import { PushSubscriptionRepository } from '~~/server/repositories/pushSubscription.repository';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { unsubscribePushSchema } from '~~/shared/schemas/push.schema';

export default createEventHandler(unsubscribePushSchema, async (event) => {
  const log = createContextLogger(event, 'API:push.unsubscribe');
  const repo = new PushSubscriptionRepository();
  const { endpoint } = event.validatedBody;

  log.info('Unsubscribing from push notifications');

  const deletedCount = await repo.deleteByEndpoint(endpoint);

  log.info('Successfully unsubscribed from push notifications', {
    deletedCount,
  });

  return { success: true };
});
