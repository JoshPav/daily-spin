import { z } from 'zod';
import {
  type ApiSchema,
  ArtistSchema,
  type EndpointContract,
} from './common.schema';

// Shared object schemas
export const FutureListenAlbumSchema = z.object({
  spotifyId: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  artists: z.array(ArtistSchema),
});

export const FutureListenItemSchema = z.object({
  id: z.string(),
  date: z.string(),
  album: FutureListenAlbumSchema,
});

// GET /api/future-listens
export const getFutureListensSchema = {
  response: z.object({
    items: z.array(FutureListenItemSchema),
  }),
} satisfies ApiSchema;

export type GetFutureListens = EndpointContract<typeof getFutureListensSchema>;

// POST /api/future-listens
export const addFutureListenSchema = {
  body: z.object({
    spotifyId: z.string(),
    name: z.string(),
    imageUrl: z.string().optional(),
    releaseDate: z.string().optional(),
    totalTracks: z.number().optional(),
    artists: z.array(ArtistSchema),
    date: z.string(),
  }),
  response: FutureListenItemSchema,
} satisfies ApiSchema;

export type AddFutureListen = EndpointContract<typeof addFutureListenSchema>;

// DELETE /api/future-listens/[id]
export const deleteFutureListenSchema = {
  params: z.object({
    id: z.string(),
  }),
} satisfies ApiSchema;

export type DeleteFutureListen = EndpointContract<
  typeof deleteFutureListenSchema
>;

// Inferred types for shared schemas
export type FutureListenAlbum = z.infer<typeof FutureListenAlbumSchema>;
export type FutureListenItem = z.infer<typeof FutureListenItemSchema>;

// Convenience type aliases (for backward compatibility)
export type GetFutureListensResponse = GetFutureListens['response'];
export type AddFutureListenBody = AddFutureListen['body'];
export type AddFutureListenResponse = AddFutureListen['response'];
