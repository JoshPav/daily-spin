// Utility types

// Backlog schemas and types
export {
  // Inferred types
  type AddBacklogItemBody,
  // Endpoint contract types
  type AddBacklogItems,
  type AddBacklogItemsBody,
  type AddBacklogItemsResponse,
  // Endpoint schemas
  addBacklogItemsSchema,
  type BacklogAlbum,
  // Shared object schemas
  BacklogAlbumSchema,
  type BacklogArtist,
  BacklogArtistSchema,
  type BacklogSuggestion,
  BacklogSuggestionSchema,
  type DeleteBacklogItem,
  deleteBacklogItemSchema,
  type GetBacklog,
  type GetBacklogResponse,
  getBacklogSchema,
} from './backlog.schema';
export type { ApiSchema, EndpointContract } from './common.schema';
// Common schemas and types
export {
  type Album,
  AlbumSchema,
  type Artist,
  ArtistSchema,
  type FavoriteSong,
  FavoriteSongSchema,
  type ListenMetadata,
  ListenMetadataSchema,
  type ListenMethod,
  ListenMethodSchema,
  type ListenOrder,
  ListenOrderSchema,
  type ListenTime,
  ListenTimeSchema,
  type PlaylistType,
  PlaylistTypeSchema,
} from './common.schema';
// Listens schemas and types
export {
  // Inferred types
  type AddAlbumListenBody,
  // Endpoint contract types
  type AddListen,
  // Endpoint schemas
  addListenSchema,
  type DailyAlbumListen,
  // Shared object schemas
  DailyAlbumListenSchema,
  type DailyListens,
  DailyListensSchema,
  type GetListens,
  type GetListensQueryParams,
  type GetListensResponse,
  getListensSchema,
  type UpdateFavoriteSong,
  type UpdateFavoriteSongBody,
  type UpdateFavoriteSongResponse,
  updateFavoriteSongSchema,
} from './listens.schema';
// Preferences schemas and types
export {
  // Endpoint contract types
  type GetPreferences,
  // Inferred types
  type GetPreferencesResponse,
  // Endpoint schemas
  getPreferencesSchema,
  type LinkedPlaylist,
  // Shared object schemas
  LinkedPlaylistSchema,
  type UpdatePreferences,
  type UpdatePreferencesBody,
  type UpdatePreferencesResponse,
  type UserPreferences,
  UserPreferencesSchema,
  updatePreferencesSchema,
} from './preferences.schema';
// Push notification schemas and types
export {
  // Inferred types
  type PushNotificationPayload,
  // Shared object schemas
  PushNotificationPayloadSchema,
  PushSubscriptionKeysSchema,
  // Endpoint contract types
  type SubscribePush,
  type SubscribePushBody,
  // Endpoint schemas
  subscribePushSchema,
  type UnsubscribePush,
  type UnsubscribePushBody,
  unsubscribePushSchema,
} from './push.schema';
// Scheduled listens schemas and types
export {
  // Endpoint contract types
  type AddScheduledListen,
  // Inferred types
  type AddScheduledListenBody,
  type AddScheduledListenResponse,
  // Endpoint schemas
  addScheduledListenSchema,
  type DeleteScheduledListen,
  deleteScheduledListenSchema,
  type GetScheduledListens,
  type GetScheduledListensResponse,
  getScheduledListensSchema,
  type ScheduledListenAlbum,
  // Shared object schemas
  ScheduledListenAlbumSchema,
  type ScheduledListenItem,
  ScheduledListenItemSchema,
  type ScheduledListensPagination,
  ScheduledListensPaginationSchema,
} from './scheduledListen.schema';
