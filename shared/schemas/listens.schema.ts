import { z } from 'zod';
import {
  AlbumSchema,
  type ApiSchema,
  type EndpointContract,
  FavoriteSongSchema,
  ListenMetadataSchema,
} from './common.schema';

// Shared object schemas
export const DailyAlbumListenSchema = z.object({
  id: z.string(),
  album: AlbumSchema,
  listenMetadata: ListenMetadataSchema,
});

export const DailyListensSchema = z.object({
  date: z.string(),
  albums: z.array(DailyAlbumListenSchema),
  favoriteSong: FavoriteSongSchema.nullable(),
});

// GET /api/listens
export const getListensSchema = {
  query: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
  response: z.array(DailyListensSchema),
} satisfies ApiSchema;

export type GetListens = EndpointContract<typeof getListensSchema>;

// POST /api/listens
export const addListenSchema = {
  body: z.object({
    album: AlbumSchema,
    listenMetadata: ListenMetadataSchema,
    date: z.string(),
  }),
} satisfies ApiSchema;

export type AddListen = EndpointContract<typeof addListenSchema>;

// PATCH /api/listens/[date]/favorite-song
export const updateFavoriteSongSchema = {
  params: z.object({
    date: z.iso.date().transform((d) => new Date(d)),
  }),
  body: z.union([FavoriteSongSchema, z.object({ spotifyId: z.null() })]),
  response: z.object({
    favoriteSong: FavoriteSongSchema.nullable(),
  }),
} satisfies ApiSchema;

export type UpdateFavoriteSong = EndpointContract<
  typeof updateFavoriteSongSchema
>;

// Inferred types for shared schemas
export type DailyAlbumListen = z.infer<typeof DailyAlbumListenSchema>;
export type DailyListens = z.infer<typeof DailyListensSchema>;

// Convenience type aliases (for backward compatibility)
export type GetListensQueryParams = GetListens['query'];
export type GetListensResponse = GetListens['response'];
export type AddAlbumListenBody = AddListen['body'];
export type UpdateFavoriteSongBody = UpdateFavoriteSong['body'];
export type UpdateFavoriteSongResponse = UpdateFavoriteSong['response'];
