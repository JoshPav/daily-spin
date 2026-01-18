import type {
  FavoriteSong,
  GetListensResponse,
  UpdateFavoriteSong,
} from '#shared/schema';

export const useFavoriteSong = () => {
  const saving = ref(false);
  const error = ref<string | null>(null);

  const updateListensCache = (
    date: string,
    favoriteSong: FavoriteSong | null,
  ) => {
    const nuxtApp = useNuxtApp();

    // Find and update all cached listens data that contains this date
    for (const key of Object.keys(nuxtApp.payload.data)) {
      if (!key.startsWith('listens-')) continue;

      const { data } = useNuxtData<GetListensResponse>(key);
      if (!data.value) continue;

      const datePrefix = date.split('T')[0] ?? date;
      const dailyListen = data.value.find((dl) =>
        dl.date.startsWith(datePrefix),
      );
      if (dailyListen) {
        dailyListen.favoriteSong = favoriteSong;
        return;
      }
    }
  };

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

      // Update the cached listens data so it persists across component re-renders
      updateListensCache(date, result.favoriteSong);

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
