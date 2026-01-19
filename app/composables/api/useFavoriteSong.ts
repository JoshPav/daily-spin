import type { FavoriteSong, UpdateFavoriteSong } from '#shared/schema';

interface UseFavoriteSongOptions {
  onUpdate?: (date: string, favoriteSong: FavoriteSong | null) => void;
}

export const useFavoriteSong = (options: UseFavoriteSongOptions = {}) => {
  const saving = ref(false);
  const error = ref<string | null>(null);

  const updateFavoriteSong = async (
    date: string,
    song: {
      spotifyId: string;
      name: string;
      trackNumber: number;
      albumId: string;
    } | null,
  ): Promise<FavoriteSong | null> => {
    saving.value = true;
    error.value = null;

    // Format date for API (YYYY-MM-DD)
    const dateParam = date.split('T')[0];

    try {
      const body = song
        ? {
            spotifyId: song.spotifyId,
            name: song.name,
            trackNumber: song.trackNumber,
            albumId: song.albumId,
          }
        : { spotifyId: null };

      const result = await $fetch<UpdateFavoriteSong['response']>(
        `/api/listens/${dateParam}/favorite-song`,
        {
          method: 'PATCH',
          body,
        },
      );

      // Notify caller of the update so they can update their state
      options.onUpdate?.(date, result.favoriteSong);

      return result.favoriteSong;
    } catch (e) {
      console.error('Failed to update favorite song:', e);
      error.value = 'Failed to save favorite song';
      throw e;
    } finally {
      saving.value = false;
    }
  };

  const clearFavoriteSong = async (date: string) => {
    return updateFavoriteSong(date, null);
  };

  return {
    saving,
    error,
    updateFavoriteSong,
    clearFavoriteSong,
  };
};
