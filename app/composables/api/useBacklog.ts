import type { GetBacklogResponse } from '#shared/schema';

export const useBacklog = () => {
  return useFetch<GetBacklogResponse>('/api/backlog', {
    key: 'backlog',
  });
};
