import type { ToggleNoSkipResponse } from '#shared/schema';

interface UseNoSkipOptions {
  onUpdate?: (spotifyAlbumId: string, noSkip: boolean) => void;
}

export const useNoSkip = (options: UseNoSkipOptions = {}) => {
  const saving = ref(false);
  const error = ref<string | null>(null);

  const toggleNoSkip = async (
    spotifyAlbumId: string,
    noSkip: boolean,
  ): Promise<boolean> => {
    saving.value = true;
    error.value = null;

    try {
      const result = await $fetch<ToggleNoSkipResponse>(
        `/api/albums/${spotifyAlbumId}/no-skip`,
        { method: 'PATCH', body: { noSkip } },
      );

      options.onUpdate?.(spotifyAlbumId, result.noSkip);

      return result.noSkip;
    } catch (e) {
      console.error('Failed to toggle no-skip:', e);
      error.value = 'Failed to save no-skip label';
      throw e;
    } finally {
      saving.value = false;
    }
  };

  return { saving, error, toggleNoSkip };
};
