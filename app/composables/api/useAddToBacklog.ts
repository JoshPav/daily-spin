import { ref } from 'vue';
import type { AddBacklogItemsResponse } from '#shared/schema';
import type { SearchResult } from './useSpotifyAlbumSearch';

type UseAddToBacklogProps = {
  onSuccess?: (response: AddBacklogItemsResponse) => void;
};

export const useAddToBacklog = ({
  onSuccess = () => {},
}: UseAddToBacklogProps = {}) => {
  const selectedAlbums = ref<SearchResult[]>([]);
  const saving = ref(false);
  const error = ref<string | null>(null);

  const isSelected = (album: SearchResult) =>
    selectedAlbums.value.some((a) => a.id === album.id);

  const toggleSelection = (album: SearchResult) => {
    if (isSelected(album)) {
      selectedAlbums.value = selectedAlbums.value.filter(
        (a) => a.id !== album.id,
      );
    } else {
      selectedAlbums.value = [...selectedAlbums.value, album];
    }
  };

  const clearSelection = () => {
    selectedAlbums.value = [];
  };

  const addToBacklog = async () => {
    if (selectedAlbums.value.length === 0) return;

    saving.value = true;
    error.value = null;

    try {
      const body = selectedAlbums.value.map((album) => ({
        spotifyId: album.id,
        name: album.name,
        imageUrl: album.images[0]?.url,
        releaseDate: album.release_date,
        totalTracks: album.total_tracks,
        artists: album.artists.map((artist) => ({
          spotifyId: artist.id,
          name: artist.name,
        })),
      }));

      const response = await $fetch<AddBacklogItemsResponse>('/api/backlog', {
        method: 'POST',
        body,
      });

      clearSelection();
      onSuccess(response);
      return response;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to add albums';
      throw err;
    } finally {
      saving.value = false;
    }
  };

  return {
    selectedAlbums,
    saving,
    error,
    isSelected,
    toggleSelection,
    clearSelection,
    addToBacklog,
  };
};
