import type { SearchResults, SimplifiedAlbum } from '@spotify/web-api-ts-sdk';
import { ref, watch } from 'vue';

const SEARCH_LIMIT = 20;
const MIN_ALBUM_TRACKS = 5;

export type SearchResult = SearchResults<['album']>['albums']['items'][number];

/**
 * Filter albums based on album type and track count
 * @param albums - List of albums to filter
 * @param allowEPs - Whether to include EPs (album_type === 'single' with enough tracks)
 */
const filterAlbums = (
  albums: SimplifiedAlbum[],
  allowEPs: boolean,
): SimplifiedAlbum[] => {
  return albums.filter((album) => {
    if (album.total_tracks < MIN_ALBUM_TRACKS) return false;
    if (album.album_type === 'album') return true;
    if (allowEPs && album.album_type === 'single') return true;
    return false;
  });
};

export const useSpotifyAlbumSearch = () => {
  const searchQuery = ref('');
  const searchResults = ref<SearchResult[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const allowEPs = ref(false);
  let debounceTimeout: NodeJS.Timeout | null = null;

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      searchResults.value = [];
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const api = await useSpotifyApi();

      if (!api) {
        return;
      }
      const data = await api.search(query, ['album'], undefined, SEARCH_LIMIT);

      const allResults = data.albums?.items || [];
      searchResults.value = filterAlbums(allResults, allowEPs.value);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Search failed';
      searchResults.value = [];
    } finally {
      loading.value = false;
    }
  };

  const debouncedSearch = (query: string) => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    searchQuery.value = query;

    if (!query.trim()) {
      searchResults.value = [];
      return;
    }

    debounceTimeout = setTimeout(() => {
      performSearch(query);
    }, 500);
  };

  // Re-filter results when allowEPs changes (re-run search with current query)
  watch(allowEPs, () => {
    if (searchQuery.value.trim()) {
      performSearch(searchQuery.value);
    }
  });

  return {
    searchQuery,
    searchResults,
    loading,
    error,
    allowEPs,
    search: debouncedSearch,
  };
};
