import { z } from 'zod';
import {
  type ApiSchema,
  ArtistSchema,
  type EndpointContract,
} from './common.schema';

// Shared object schemas
export const BacklogArtistSchema = ArtistSchema;

export const BacklogAlbumSchema = z.object({
  id: z.string(),
  spotifyId: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  artists: z.array(BacklogArtistSchema),
  addedAt: z.string(),
  releaseDate: z.string().nullable(),
});

export const BacklogSuggestionSchema = z.object({
  albumId: z.string(),
  albumName: z.string(),
  artistNames: z.string(),
  imageUrl: z.string(),
  source: z.literal('backlog'),
});

// GET /api/backlog
export const getBacklogSchema = {
  response: z.object({
    albums: z.array(BacklogAlbumSchema),
  }),
} satisfies ApiSchema;

export type GetBacklog = EndpointContract<typeof getBacklogSchema>;

// POST /api/backlog
export const addBacklogItemsSchema = {
  body: z.array(
    z.object({
      spotifyId: z.string(),
      name: z.string(),
      imageUrl: z.string().optional(),
      releaseDate: z.string().optional(),
      totalTracks: z.number().optional(),
      artists: z.array(BacklogArtistSchema),
    }),
  ),
  response: z.object({
    added: z.array(BacklogAlbumSchema),
    skipped: z.array(z.string()),
  }),
} satisfies ApiSchema;

export type AddBacklogItems = EndpointContract<typeof addBacklogItemsSchema>;

// DELETE /api/backlog/[id]
export const deleteBacklogItemSchema = {
  params: z.object({
    id: z.string(),
  }),
} satisfies ApiSchema;

export type DeleteBacklogItem = EndpointContract<
  typeof deleteBacklogItemSchema
>;

// Inferred types for shared schemas
export type BacklogArtist = z.infer<typeof BacklogArtistSchema>;
export type BacklogAlbum = z.infer<typeof BacklogAlbumSchema>;
export type BacklogSuggestion = z.infer<typeof BacklogSuggestionSchema>;

// Convenience type aliases (for backward compatibility)
export type GetBacklogResponse = GetBacklog['response'];
export type AddBacklogItemBody = AddBacklogItems['body'][number];
export type AddBacklogItemsBody = AddBacklogItems['body'];
export type AddBacklogItemsResponse = AddBacklogItems['response'];
