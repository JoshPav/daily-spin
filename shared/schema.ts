export type ListenMetadata = {
  inOrder: boolean;
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
  startDate?: string;
  endDate?: string;
};

export type GetListensResponse = DailyListens[];

export type GetListens = {
  query: GetListensQueryParams;
  response: GetListensResponse;
};
