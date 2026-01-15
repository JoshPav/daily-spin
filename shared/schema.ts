export type ListenMetadata = {
  listenOrder: ListenOrder;
  listenMethod: ListenMethod;
  listenTime: ListenTime | null;
};

export type Album = {
  albumId: string;
  albumName: string;
  artistNames: string;
  imageUrl: string;
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
export type BacklogAlbum = {
  id: string;
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  artistNames: string;
  addedFromArtistId: string | null;
  addedFromArtistName: string | null;
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
  artistNames: string;
  addedFromArtistId?: string;
  addedFromArtistName?: string;
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
