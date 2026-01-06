import type { GetListensResponse } from '~/server/schema';

export const useListens = (year?: number, month?: number) => {
  const currentDate = new Date();
  const queryYear = year ?? currentDate.getFullYear();
  const queryMonth = month ?? currentDate.getMonth() + 1;

  return useFetch<GetListensResponse>('/api/listens', {
    query: {
      year: queryYear,
      month: queryMonth,
    },
    key: `listens-${queryYear}-${queryMonth}`,
  });
};
