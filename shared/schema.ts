export type FavoriteSong = {
  spotifyId: string;
  name: string;
  trackNumber: number;
};

export type ListenMetadata = {
  listenOrder: ListenOrder;
  listenMethod: ListenMethod;
  listenTime: ListenTime | null;
  favoriteSong: FavoriteSong | null;
};

export type Artist = {
  spotifyId: string;
  name: string;
  imageUrl?: string;
};

export type Album = {
  albumId: string;
  albumName: string;
  imageUrl: string;
  artists: Artist[];
};

export type DailyAlbumListen = {
  album: Album;
  listenMetadata: ListenMetadata;
};

export type DailyListens = {
  date: string;
  albums: DailyAlbumListen[];
};

export type GetListensQueryParams = {
  startDate: string;
  endDate: string;
};

export type GetListensResponse = DailyListens[];

export type GetListens = {
  query: GetListensQueryParams;
  params: never;
  body: never;
  response: GetListensResponse;
};

export type ListenMethod = 'spotify' | 'vinyl' | 'streamed';

export type ListenOrder = 'ordered' | 'shuffled' | 'interrupted';

export type ListenTime = 'morning' | 'noon' | 'evening' | 'night';

export type AddAlbumListenBody = DailyAlbumListen & {
  date: string;
};

export type AddListen = {
  query: never;
  params: never;
  body: AddAlbumListenBody;
  response: never;
};

// Backlog types
export type BacklogArtist = Artist;

export type BacklogAlbum = {
  id: string;
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  artists: BacklogArtist[];
  addedAt: string;
};

// API endpoint types
export type GetBacklogResponse = {
  albums: BacklogAlbum[];
};

export type GetBacklog = {
  query: never;
  params: never;
  body: never;
  response: GetBacklogResponse;
};

export type AddBacklogItemBody = {
  spotifyId: string;
  name: string;
  imageUrl?: string;
  releaseDate?: string;
  totalTracks?: number;
  artists: BacklogArtist[];
};

export type AddBacklogItemsBody = AddBacklogItemBody[];

export type AddBacklogItemsResponse = {
  added: BacklogAlbum[];
  skipped: string[]; // Album IDs that were already in backlog
};

export type AddBacklogItems = {
  query: never;
  params: never;
  body: AddBacklogItemsBody;
  response: AddBacklogItemsResponse;
};

export type DeleteBacklogItem = {
  query: never;
  params: { id: string };
  body: never;
  response: never;
};

// Type for background task suggestions
export type BacklogSuggestion = {
  albumId: string;
  albumName: string;
  artistNames: string;
  imageUrl: string;
  source: 'backlog';
};

// Future listens types
export type FutureListenAlbum = {
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  artists: Artist[];
};

export type FutureListenItem = {
  id: string;
  date: string;
  album: FutureListenAlbum;
};

export type GetFutureListensResponse = {
  items: FutureListenItem[];
};

export type GetFutureListens = {
  query: never;
  params: never;
  body: never;
  response: GetFutureListensResponse;
};

export type AddFutureListenBody = {
  spotifyId: string;
  name: string;
  imageUrl?: string;
  releaseDate?: string;
  totalTracks?: number;
  artists: Artist[];
  date: string;
};

export type AddFutureListen = {
  query: never;
  params: never;
  body: AddFutureListenBody;
  response: FutureListenItem;
};

export type DeleteFutureListen = {
  query: never;
  params: { id: string };
  body: never;
  response: never;
};

// User preferences types
export type UserPreferences = {
  trackListeningHistory: boolean;
  createTodaysAlbumPlaylist: boolean;
  createSongOfDayPlaylist: boolean;
};

export type PlaylistType = 'album_of_the_day' | 'song_of_the_day';

export type LinkedPlaylist = {
  type: PlaylistType;
  spotifyPlaylistId: string;
  spotifyUrl: string;
};

export type GetPreferencesResponse = {
  preferences: UserPreferences;
  linkedPlaylists: LinkedPlaylist[];
};

export type UpdatePreferencesBody = Partial<UserPreferences>;

export type GetPreferences = {
  query: never;
  params: never;
  body: never;
  response: GetPreferencesResponse;
};

export type UpdatePreferences = {
  query: never;
  params: never;
  body: UpdatePreferencesBody;
  response: GetPreferencesResponse;
};
