export type DailyListens = {
  dayOfMonth: number;
  albums: string[];
};

export type GetListensQueryParams = {
  year?: string;
  month?: string;
};

export type GetListensResponse = DailyListens[];

export type GetListens = {
  query: GetListensQueryParams;
  response: GetListensResponse;
};
