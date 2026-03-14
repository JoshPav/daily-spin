import { z } from 'zod';
import type { ApiSchema, EndpointContract } from './common.schema';

// PATCH /api/albums/[spotifyAlbumId]/no-skip
export const toggleNoSkipSchema = {
  params: z.object({
    spotifyAlbumId: z.string(),
  }),
  body: z.object({
    noSkip: z.boolean(),
  }),
  response: z.object({
    noSkip: z.boolean(),
  }),
} satisfies ApiSchema;

export type ToggleNoSkip = EndpointContract<typeof toggleNoSkipSchema>;
export type ToggleNoSkipBody = ToggleNoSkip['body'];
export type ToggleNoSkipResponse = ToggleNoSkip['response'];
