import type { GetFutureListensResponse } from '#shared/schema';

export const useFutureListens = () => {
  return useFetch<GetFutureListensResponse>('/api/future-listens', {
    key: 'future-listens',
  });
};
