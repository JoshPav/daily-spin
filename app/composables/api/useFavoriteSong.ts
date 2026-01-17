import type { FavoriteSong, UpdateFavoriteSong } from '#shared/schema';

export const useFavoriteSong = () => {
  const saving = ref(false);
  const error = ref<string | null>(null);

  const updateFavoriteSong = async (
    albumListenId: string,
    song: { spotifyId: string; name: string; trackNumber: number } | null,
  ): Promise<FavoriteSong | null> => {
    saving.value = true;
    error.value = null;

    try {
      const body = song
        ? { spotifyId: song.spotifyId, name: song.name, trackNumber: song.trackNumber }
        : { spotifyId: null };

      const result = await $fetch<UpdateFavoriteSong['response']>(
        `/api/listens/${albumListenId}/favorite-song`,
        {
          method: 'PATCH',
          body,
        },
      );

      return result.favoriteSong;
    } catch (e) {
      console.error('Failed to update favorite song:', e);
      error.value = 'Failed to save favorite song';
      throw e;
    } finally {
      saving.value = false;
    }
  };

  const clearFavoriteSong = async (albumListenId: string) => {
    return updateFavoriteSong(albumListenId, null);
  };

  return {
    saving,
    error,
    updateFavoriteSong,
    clearFavoriteSong,
  };
};
