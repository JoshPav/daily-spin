import type { SimplifiedAlbum } from '@spotify/web-api-ts-sdk';

const DESIRED_IMAGE_SIZE = 300;
const MIN_ALBUM_TRACKS = 4;
const MAX_EP_TRACKS = 7;

export const getAlbumArtwork = (images: SimplifiedAlbum['images']) => {
  const desiredImage = images.find(
    (image) => image.width === DESIRED_IMAGE_SIZE,
  );

  return (desiredImage || images[0])?.url;
};

/**
 * Determines if an album is a "real album" vs EP/single/compilation
 */
export const isRealAlbum = (album: SimplifiedAlbum): boolean => {
  // Must have minimum track count
  if (album.total_tracks < MIN_ALBUM_TRACKS) {
    return false;
  }

  // Filter by album_type - prefer 'album' over 'single' or 'compilation'
  if (album.album_type === 'single') {
    return false;
  }

  // Some EPs are marked as 'album' but have few tracks
  if (album.album_type === 'album' && album.total_tracks <= MAX_EP_TRACKS) {
    // Could be an EP, but we'll allow it if it has at least MIN_ALBUM_TRACKS
    return true;
  }

  // Compilations might be included or excluded based on preference
  // For now, let's exclude them
  if (album.album_type === 'compilation') {
    return false;
  }

  return true;
};

/**
 * Filter a list of albums to only include "real albums"
 */
export const filterRealAlbums = (
  albums: SimplifiedAlbum[],
): SimplifiedAlbum[] => {
  return albums.filter(isRealAlbum);
};
