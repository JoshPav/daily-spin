// Re-export all types from Zod schemas
// This file maintains backward compatibility with existing imports

// Utility types
// Common types
// Listens types
// Backlog types
// Future listens types
// Preferences types
export type {
  AddAlbumListenBody,
  AddBacklogItemBody,
  AddBacklogItems,
  AddBacklogItemsBody,
  AddBacklogItemsResponse,
  AddFutureListen,
  AddFutureListenBody,
  AddListen,
  Album,
  ApiSchema,
  Artist,
  BacklogAlbum,
  BacklogArtist,
  BacklogSuggestion,
  DailyAlbumListen,
  DailyListens,
  DeleteBacklogItem,
  DeleteFutureListen,
  EndpointContract,
  FavoriteSong,
  FutureListenAlbum,
  FutureListenItem,
  FutureListensPagination,
  GetBacklog,
  GetBacklogResponse,
  GetFutureListens,
  GetFutureListensResponse,
  GetListens,
  GetListensQueryParams,
  GetListensResponse,
  GetPreferences,
  GetPreferencesResponse,
  LinkedPlaylist,
  ListenMetadata,
  ListenMethod,
  ListenOrder,
  ListenTime,
  PlaylistType,
  UpdateFavoriteSong,
  UpdateFavoriteSongBody,
  UpdateFavoriteSongResponse,
  UpdatePreferences,
  UpdatePreferencesBody,
  UserPreferences,
} from './schemas';
