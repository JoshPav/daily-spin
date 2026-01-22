import { z } from 'zod';
import {
  type ApiSchema,
  ArtistSchema,
  dateString,
  type EndpointContract,
  optionalDateQuery,
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
  date: dateString,
  album: FutureListenAlbumSchema,
});

// Pagination schema for future listens
export const FutureListensPaginationSchema = z.object({
  startDate: dateString,
  endDate: dateString,
  total: z.number(),
  hasMore: z.boolean(),
});

// GET /api/future-listens
export const getFutureListensSchema = {
  query: z.object({
    startDate: optionalDateQuery,
    endDate: optionalDateQuery,
  }),
  response: z.object({
    items: z.record(dateString, FutureListenItemSchema.nullable()),
    pagination: FutureListensPaginationSchema,
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
    date: dateString,
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
export type FutureListensPagination = z.infer<
  typeof FutureListensPaginationSchema
>;

// Convenience type aliases (for backward compatibility)
export type GetFutureListensResponse = GetFutureListens['response'];
export type AddFutureListenBody = AddFutureListen['body'];
export type AddFutureListenResponse = AddFutureListen['response'];
