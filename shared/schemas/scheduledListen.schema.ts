import { z } from 'zod';
import {
  type ApiSchema,
  ArtistSchema,
  dateString,
  type EndpointContract,
  optionalDateQuery,
} from './common.schema';

// Shared object schemas
export const ScheduledListenAlbumSchema = z.object({
  spotifyId: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  artists: z.array(ArtistSchema),
  releaseDate: z.string().nullable(),
});

export const ScheduledListenItemSchema = z.object({
  id: z.string(),
  date: dateString,
  album: ScheduledListenAlbumSchema,
});

// Pagination schema for scheduled listens
export const ScheduledListensPaginationSchema = z.object({
  startDate: dateString,
  endDate: dateString,
  total: z.number(),
  hasMore: z.boolean(),
});

// GET /api/listens/scheduled
export const getScheduledListensSchema = {
  query: z.object({
    startDate: optionalDateQuery,
    endDate: optionalDateQuery,
  }),
  response: z.object({
    items: z.record(dateString, ScheduledListenItemSchema.nullable()),
    pagination: ScheduledListensPaginationSchema,
  }),
} satisfies ApiSchema;

export type GetScheduledListens = EndpointContract<
  typeof getScheduledListensSchema
>;

// POST /api/listens/scheduled
export const addScheduledListenSchema = {
  body: z.object({
    spotifyId: z.string(),
    name: z.string(),
    imageUrl: z.string().optional(),
    releaseDate: z.string().optional(),
    totalTracks: z.number().optional(),
    artists: z.array(ArtistSchema),
    date: dateString,
  }),
  response: ScheduledListenItemSchema,
} satisfies ApiSchema;

export type AddScheduledListen = EndpointContract<
  typeof addScheduledListenSchema
>;

// DELETE /api/listens/scheduled/[id]
export const deleteScheduledListenSchema = {
  params: z.object({
    id: z.string(),
  }),
} satisfies ApiSchema;

export type DeleteScheduledListen = EndpointContract<
  typeof deleteScheduledListenSchema
>;

// Inferred types for shared schemas
export type ScheduledListenAlbum = z.infer<typeof ScheduledListenAlbumSchema>;
export type ScheduledListenItem = z.infer<typeof ScheduledListenItemSchema>;
export type ScheduledListensPagination = z.infer<
  typeof ScheduledListensPaginationSchema
>;

// Convenience type aliases (for backward compatibility)
export type GetScheduledListensResponse = GetScheduledListens['response'];
export type AddScheduledListenBody = AddScheduledListen['body'];
export type AddScheduledListenResponse = AddScheduledListen['response'];
