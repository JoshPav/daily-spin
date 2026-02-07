import type { SimplifiedAlbum } from '@spotify/web-api-ts-sdk';
import { ref } from 'vue';

const RELEASES_LIMIT = 50;
const MIN_ALBUM_TRACKS = 4;

/**
 * Filter to only include full albums with enough tracks
 */
const filterAlbums = (albums: SimplifiedAlbum[]): SimplifiedAlbum[] => {
  return albums.filter((album) => {
    if (album.total_tracks < MIN_ALBUM_TRACKS) return false;
    return album.album_type === 'album';
  });
};

/**
 * Sort albums by release date (newest first)
 */
const sortByReleaseDate = (albums: SimplifiedAlbum[]): SimplifiedAlbum[] => {
  return [...albums].sort((a, b) => {
    // Spotify dates can be "2024", "2024-01", or "2024-01-15"
    // Sorting as strings works for ISO date formats
    return (b.release_date || '').localeCompare(a.release_date || '');
  });
};

export const useSpotifyNewReleases = () => {
  const releases = ref<SimplifiedAlbum[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const hasFetched = ref(false);

  const fetchNewReleases = async () => {
    loading.value = true;
    error.value = null;

    try {
      const api = await useSpotifyApi();

      if (!api) {
        return;
      }

      const data = await api.browse.getNewReleases(undefined, RELEASES_LIMIT);
      const filtered = filterAlbums(data.albums?.items || []);
      releases.value = sortByReleaseDate(filtered);
      hasFetched.value = true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to fetch new releases';
      releases.value = [];
    } finally {
      loading.value = false;
    }
  };

  const reset = () => {
    releases.value = [];
    hasFetched.value = false;
    error.value = null;
  };

  return {
    releases,
    loading,
    error,
    hasFetched,
    fetchNewReleases,
    reset,
  };
};
