export type ListenMetadata = {
  inOrder: boolean;
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
