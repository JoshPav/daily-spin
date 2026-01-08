import type { GetListensResponse } from '#shared/schema';

export const useListens = (startDate?: string, endDate?: string) => {
  const query: Record<string, string> = {};

  if (startDate) {
    query.startDate = startDate;
  }

  if (endDate) {
    query.endDate = endDate;
  }

  const key =
    startDate && endDate
      ? `listens-${startDate}-${endDate}`
      : 'listens-default';

  return useFetch<GetListensResponse>('/api/listens', {
    query,
    key,
  });
};
