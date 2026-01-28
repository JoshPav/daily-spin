import { z } from 'zod';
import type { ApiSchema, EndpointContract } from './common.schema';

// Push subscription keys schema
export const PushSubscriptionKeysSchema = z.object({
  p256dh: z.string(),
  auth: z.string(),
});

// POST /api/push/subscribe
export const subscribePushSchema = {
  body: z.object({
    endpoint: z.string().url(),
    keys: PushSubscriptionKeysSchema,
    expirationTime: z.number().nullable().optional(),
  }),
  response: z.object({
    success: z.boolean(),
  }),
} satisfies ApiSchema;

export type SubscribePush = EndpointContract<typeof subscribePushSchema>;

// POST /api/push/unsubscribe
export const unsubscribePushSchema = {
  body: z.object({
    endpoint: z.string().url(),
  }),
  response: z.object({
    success: z.boolean(),
  }),
} satisfies ApiSchema;

export type UnsubscribePush = EndpointContract<typeof unsubscribePushSchema>;

// Push notification payload (used by service)
export const PushNotificationPayloadSchema = z.object({
  title: z.string(),
  body: z.string(),
  icon: z.string().optional(),
  badge: z.string().optional(),
  data: z
    .object({
      type: z.string(),
      url: z.string().optional(),
    })
    .optional(),
  actions: z
    .array(
      z.object({
        action: z.string(),
        title: z.string(),
      }),
    )
    .optional(),
});

export type PushNotificationPayload = z.infer<
  typeof PushNotificationPayloadSchema
>;

// Inferred types
export type SubscribePushBody = SubscribePush['body'];
export type UnsubscribePushBody = UnsubscribePush['body'];
