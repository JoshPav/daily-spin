import type {
  SimplifiedAlbum,
  SimplifiedArtist,
} from '@spotify/web-api-ts-sdk';

/**
 * Get comma-separated artist names from an album or array of artists
 */
export const getArtistNames = (
  albumOrArtists: SimplifiedAlbum | SimplifiedArtist[],
): string => {
  const artists = Array.isArray(albumOrArtists)
    ? albumOrArtists
    : albumOrArtists.artists;
  return artists.map((a) => a.name).join(', ');
};

/**
 * Format a Spotify release date for display.
 * Spotify returns dates in various formats: "2024", "2024-01", or "2024-01-15"
 */
export const formatReleaseDate = (
  dateString: string | undefined,
): string | null => {
  if (!dateString) return null;

  // Year only
  if (dateString.length === 4) {
    return dateString;
  }

  // Year-month
  if (dateString.length === 7) {
    const parts = dateString.split('-');
    const year = parts[0] ?? '1970';
    const month = parts[1] ?? '01';
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  }

  // Full date
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
