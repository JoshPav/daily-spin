import { ref } from 'vue';
import type {
  GetPreferencesResponse,
  UpdatePreferencesBody,
} from '#shared/schema';

type UseUpdatePreferencesProps = {
  onSuccess?: (result: GetPreferencesResponse) => void;
};

export const useUpdatePreferences = ({
  onSuccess = () => {},
}: UseUpdatePreferencesProps = {}) => {
  const updating = ref(false);

  const updatePreferences = async (preferences: UpdatePreferencesBody) => {
    updating.value = true;

    try {
      const result = await $fetch<GetPreferencesResponse>('/api/preferences', {
        method: 'PATCH',
        body: preferences,
      });

      onSuccess(result);
      return result;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    } finally {
      updating.value = false;
    }
  };

  return {
    updating,
    updatePreferences,
  };
};
