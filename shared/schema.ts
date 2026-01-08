export type ListenMetadata = {
  inOrder: boolean;
};

export type DailyAlbumListen = {
  albumId: string;
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
