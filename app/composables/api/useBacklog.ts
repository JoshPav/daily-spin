import type { GetBacklogResponse } from '#shared/schema';

export const useBacklog = () => {
  const { data, status, error, refresh } = useFetch<GetBacklogResponse>(
    '/api/backlog',
    {
      key: 'backlog',
      lazy: true,
      server: false,
    },
  );

  // Show loading when idle (before fetch starts) or pending (during fetch)
  const pending = computed(
    () => status.value === 'idle' || status.value === 'pending',
  );

  return { data, pending, error, refresh };
};
