import { PushSubscriptionRepository } from '~~/server/repositories/pushSubscription.repository';
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { subscribePushSchema } from '~~/shared/schemas/push.schema';

export default createEventHandler(subscribePushSchema, async (event) => {
  const log = createContextLogger(event, 'API:push.subscribe');
  const repo = new PushSubscriptionRepository();
  const { userId } = event.context;
  const { endpoint, keys, expirationTime } = event.validatedBody;

  log.info('Subscribing to push notifications');

  await repo.upsertSubscription(userId, {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    expirationTime: expirationTime ? new Date(expirationTime) : null,
  });

  log.info('Successfully subscribed to push notifications');

  return { success: true };
});
