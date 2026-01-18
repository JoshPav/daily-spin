import { z } from 'zod';
import {
  type ApiSchema,
  type EndpointContract,
  PlaylistTypeSchema,
} from './common.schema';

// Shared object schemas
export const UserPreferencesSchema = z.object({
  trackListeningHistory: z.boolean(),
  createTodaysAlbumPlaylist: z.boolean(),
  createSongOfDayPlaylist: z.boolean(),
});

export const LinkedPlaylistSchema = z.object({
  type: PlaylistTypeSchema,
  spotifyPlaylistId: z.string(),
  spotifyUrl: z.string(),
});

const PreferencesResponseSchema = z.object({
  preferences: UserPreferencesSchema,
  linkedPlaylists: z.array(LinkedPlaylistSchema),
});

// GET /api/preferences
export const getPreferencesSchema = {
  response: PreferencesResponseSchema,
} satisfies ApiSchema;

export type GetPreferences = EndpointContract<typeof getPreferencesSchema>;

// PATCH /api/preferences
export const updatePreferencesSchema = {
  body: UserPreferencesSchema.partial(),
  response: PreferencesResponseSchema,
} satisfies ApiSchema;

export type UpdatePreferences = EndpointContract<
  typeof updatePreferencesSchema
>;

// Inferred types for shared schemas
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type LinkedPlaylist = z.infer<typeof LinkedPlaylistSchema>;

// Convenience type aliases (for backward compatibility)
export type GetPreferencesResponse = GetPreferences['response'];
export type UpdatePreferencesBody = UpdatePreferences['body'];
export type UpdatePreferencesResponse = UpdatePreferences['response'];
