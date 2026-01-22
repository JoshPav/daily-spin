import type { SimplifiedTrack } from '@spotify/web-api-ts-sdk';

export type AlbumTrack = {
  id: string;
  name: string;
  trackNumber: number;
  durationMs: number;
};

export const useAlbumTracks = () => {
  const tracks = ref<AlbumTrack[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchTracks = async (albumId: string) => {
    loading.value = true;
    error.value = null;
    tracks.value = [];

    try {
      const spotifyApi = await useSpotifyApi();
      if (!spotifyApi) {
        error.value = 'Failed to connect to Spotify';
        return;
      }

      const album = await spotifyApi.albums.get(albumId);
      tracks.value = album.tracks.items.map(
        (track: SimplifiedTrack): AlbumTrack => ({
          id: track.id,
          name: track.name,
          trackNumber: track.track_number,
          durationMs: track.duration_ms,
        }),
      );
    } catch (e) {
      console.error('Failed to fetch album tracks:', e);
      error.value = 'Failed to load tracks';
    } finally {
      loading.value = false;
    }
  };

  return {
    tracks,
    loading,
    error,
    fetchTracks,
  };
};
