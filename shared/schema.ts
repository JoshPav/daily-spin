export type ListenMetadata = {
  listenOrder: ListenOrder;
  listenMethod: ListenMethod;
  listenTime: ListenTime | null;
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
  createdAt: string;
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
