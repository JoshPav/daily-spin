import { z } from 'zod';

// API Schema utility types
export type ApiSchema<
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
  TResponse = unknown,
> = {
  params?: z.ZodType<TParams>;
  query?: z.ZodType<TQuery>;
  body?: z.ZodType<TBody>;
  response?: z.ZodType<TResponse>;
};

type InferOrNever<T> = T extends z.ZodType ? z.infer<T> : never;

export type EndpointContract<T extends ApiSchema> = {
  params: InferOrNever<T['params']>;
  query: InferOrNever<T['query']>;
  body: InferOrNever<T['body']>;
  response: InferOrNever<T['response']>;
};

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
