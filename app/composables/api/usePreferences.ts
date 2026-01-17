import type { GetPreferencesResponse } from '#shared/schema';

export const usePreferences = () => {
  return useFetch<GetPreferencesResponse>('/api/preferences', {
    key: 'preferences',
  });
};
