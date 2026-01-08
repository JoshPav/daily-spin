import type { Album } from '@spotify/web-api-ts-sdk';
import { computed, ref } from 'vue';

// Shared cache for albums
const albumCache = ref<Map<string, Album>>(new Map());
const fetchingIds = ref<Set<string>>(new Set());
const isFetching = ref(false);

// Bulk fetch albums from Spotify
export const fetchAlbums = async (albumIds: string[]) => {
  const config = useRuntimeConfig();
  const token = config.public.spotifyAccessToken;

  // Filter out already cached albums and albums being fetched
  const idsToFetch = albumIds.filter(
    (id) => !albumCache.value.has(id) && !fetchingIds.value.has(id),
  );

  if (idsToFetch.length === 0) return;

  // Mark as fetching
  for (const id of idsToFetch) {
    fetchingIds.value.add(id);
  }
  isFetching.value = true;

  try {
    // Spotify allows max 20 albums per request
    const chunks = [];
    for (let i = 0; i < idsToFetch.length; i += 20) {
      chunks.push(idsToFetch.slice(i, i + 20));
    }

    for (const chunk of chunks) {
      const response = await fetch(
        `https://api.spotify.com/v1/albums?ids=${chunk.join(',')}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        // Cache each album
        data.albums?.forEach((album: Album | null) => {
          if (album) {
            albumCache.value.set(album.id, album);
          }
        });
      } else {
        console.error('Failed to fetch albums:', response.statusText);
      }
    }
  } catch (error) {
    console.error('Error fetching albums:', error);
  } finally {
    // Clear fetching state
    for (const id of idsToFetch) {
      fetchingIds.value.delete(id);
    }
    isFetching.value = false;
  }
};

// Get a single album from cache
export const useAlbum = (
  albumId: string | undefined,
): { data: ComputedRef<Album | undefined>; pending: ComputedRef<boolean> } => {
  const album = computed<Album | undefined>(() => {
    if (!albumId) return undefined;

    return albumCache.value.get(albumId);
  });

  const pending = computed<boolean>(() => {
    if (!albumId) return false;
    return fetchingIds.value.has(albumId);
  });

  return {
    data: album,
    pending: pending,
  };
};
