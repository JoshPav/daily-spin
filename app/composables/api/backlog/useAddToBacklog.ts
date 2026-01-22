import { ref } from 'vue';
import type { AddBacklogItemsResponse } from '#shared/schema';
import type { SearchResult } from '../spotify/useSpotifyAlbumSearch';

type UseAddToBacklogProps = {
  onSuccess?: (response: AddBacklogItemsResponse) => void;
};

/**
 * Fetches artist images from Spotify for the given artist IDs.
 * SimplifiedArtist objects from album search don't include images,
 * so we need to fetch full artist data separately.
 *
 * @returns Map of artistId -> imageUrl
 */
async function fetchArtistImages(
  artistIds: string[],
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();

  if (artistIds.length === 0) {
    return imageMap;
  }

  const api = await useSpotifyApi();
  if (!api) {
    return imageMap;
  }

  // Spotify API allows fetching up to 50 artists at once
  const BATCH_SIZE = 50;
  for (let i = 0; i < artistIds.length; i += BATCH_SIZE) {
    const batch = artistIds.slice(i, i + BATCH_SIZE);
    const artists = await api.artists.get(batch);

    for (const artist of artists) {
      const imageUrl = artist.images[0]?.url;
      if (imageUrl) {
        imageMap.set(artist.id, imageUrl);
      }
    }
  }

  return imageMap;
}

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
      // Collect unique artist IDs from all selected albums
      const uniqueArtistIds = [
        ...new Set(
          selectedAlbums.value.flatMap((album) =>
            album.artists.map((artist) => artist.id),
          ),
        ),
      ];

      // Fetch artist images (SimplifiedArtist doesn't include images)
      const artistImages = await fetchArtistImages(uniqueArtistIds);

      const body = selectedAlbums.value.map((album) => ({
        spotifyId: album.id,
        name: album.name,
        imageUrl: album.images[0]?.url,
        releaseDate: album.release_date,
        totalTracks: album.total_tracks,
        artists: album.artists.map((artist) => ({
          spotifyId: artist.id,
          name: artist.name,
          imageUrl: artistImages.get(artist.id),
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

export type BacklogActions = ReturnType<typeof useAddToBacklog>;
