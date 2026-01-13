import type { SearchResults } from '@spotify/web-api-ts-sdk';
import { ref } from 'vue';

const SEARCH_LIMIT = 3;

export type SearchResult = SearchResults<['album']>['albums']['items'][number];

export const useSpotifyAlbumSearch = () => {
  const searchQuery = ref('');
  const searchResults = ref<SearchResult[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
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

      searchResults.value = data.albums?.items || [];
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

  return {
    searchQuery,
    searchResults,
    loading,
    error,
    search: debouncedSearch,
  };
};
