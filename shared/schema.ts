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
export type BacklogType = 'album' | 'artist';

export type BacklogAlbum = {
  id: string;
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  artistNames: string | null;
  addedAt: string;
};

export type BacklogArtist = {
  id: string;
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  addedAt: string;
};

export type GetBacklogResponse = {
  albums: BacklogAlbum[];
  artists: BacklogArtist[];
};

export type GetBacklog = {
  query: never;
  params: never;
  body: never;
  response: GetBacklogResponse;
};

export type AddBacklogItemBody = {
  type: BacklogType;
  spotifyId: string;
  name: string;
  imageUrl?: string;
  artistNames?: string;
};

export type AddBacklogItemResponse = {
  id: string;
  type: BacklogType;
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  artistNames: string | null;
  addedAt: string;
};

export type AddBacklogItem = {
  query: never;
  params: never;
  body: AddBacklogItemBody;
  response: AddBacklogItemResponse;
};

export type DeleteBacklogItem = {
  query: never;
  params: { id: string };
  body: never;
  response: never;
};
