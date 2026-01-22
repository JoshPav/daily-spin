import { z } from 'zod';

// API Schema utility types
export type ApiSchema = {
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
  response?: z.ZodType;
};

type InferOrNever<T> = T extends z.ZodType ? z.infer<T> : never;

export type EndpointContract<T extends ApiSchema> = {
  params: InferOrNever<T['params']>;
  query: InferOrNever<T['query']>;
  body: InferOrNever<T['body']>;
  response: InferOrNever<T['response']>;
};

// Common schema helpers

/** YYYY-MM-DD date string schema for API requests/responses */
export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Date must be in YYYY-MM-DD format',
});

/** YYYY-MM-DD date string param that transforms to a Date object at UTC midnight */
export const dateParam = dateString.transform(
  (d) => new Date(`${d}T00:00:00.000Z`),
);

/** Optional YYYY-MM-DD date query parameter that transforms to a Date object */
export const optionalDateQuery = dateString
  .optional()
  .transform((d) => (d ? new Date(`${d}T00:00:00.000Z`) : undefined));

// Enums
export const ListenMethodSchema = z.enum(['spotify', 'vinyl', 'streamed']);
export const ListenOrderSchema = z.enum(['ordered', 'shuffled', 'interrupted']);
export const ListenTimeSchema = z.enum(['morning', 'noon', 'evening', 'night']);
export const PlaylistTypeSchema = z.enum([
  'album_of_the_day',
  'song_of_the_day',
]);

// Base types
export const ArtistSchema = z.object({
  spotifyId: z.string(),
  name: z.string(),
  imageUrl: z.string().optional(),
});

export const AlbumSchema = z.object({
  albumId: z.string(),
  albumName: z.string(),
  imageUrl: z.string(),
  artists: z.array(ArtistSchema),
  releaseDate: z.string().optional(),
});

export const ListenMetadataSchema = z.object({
  listenOrder: ListenOrderSchema,
  listenMethod: ListenMethodSchema,
  listenTime: ListenTimeSchema.nullable(),
});

export const FavoriteSongSchema = z.object({
  spotifyId: z.string(),
  name: z.string(),
  trackNumber: z.number(),
  albumId: z.string(),
});

// Infer types from schemas for use throughout the codebase
export type Artist = z.infer<typeof ArtistSchema>;
export type Album = z.infer<typeof AlbumSchema>;
export type ListenMethod = z.infer<typeof ListenMethodSchema>;
export type ListenOrder = z.infer<typeof ListenOrderSchema>;
export type ListenTime = z.infer<typeof ListenTimeSchema>;
export type ListenMetadata = z.infer<typeof ListenMetadataSchema>;
export type FavoriteSong = z.infer<typeof FavoriteSongSchema>;
export type PlaylistType = z.infer<typeof PlaylistTypeSchema>;
