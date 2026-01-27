import type { Album } from '#shared/schemas/common.schema';
import type {
  DailyAlbumListen,
  DailyListens,
} from '#shared/schemas/listens.schema';
import type { ScheduledListenAlbum } from '#shared/schemas/scheduledListen.schema';
import type { AlbumCardInfo } from '~/components/AlbumDayCard/AlbumDayCard.types';

/**
 * Converts an Album to AlbumCardInfo format for display in AlbumDayCard.
 *
 * @param album - Album from listens API (uses albumName property)
 * @returns AlbumCardInfo for display, or null if album is null
 */
export function toAlbumCardInfo(album: Album | null): AlbumCardInfo | null {
  if (!album) return null;
  return {
    imageUrl: album.imageUrl,
    artistName: album.artists[0]?.name ?? 'Unknown Artist',
    albumName: album.albumName,
  };
}

/**
 * Converts a ScheduledListenAlbum to AlbumCardInfo format for display in AlbumDayCard.
 *
 * @param album - Album from scheduled listens API (uses name property)
 * @returns AlbumCardInfo for display, or null if album is null
 */
export function scheduledAlbumToCardInfo(
  album: ScheduledListenAlbum | null,
): AlbumCardInfo | null {
  if (!album) return null;
  return {
    imageUrl: album.imageUrl,
    artistName: album.artists[0]?.name ?? 'Unknown Artist',
    albumName: album.name,
  };
}

/**
 * Selects the primary album to display when a day has multiple listens.
 *
 * Priority order:
 * 1. Album containing the favorite song (if one is set)
 * 2. First album by listen order
 *
 * @param dailyListen - The day's listening data
 * @returns The primary album to display, or null if no albums
 */
export function getPrimaryAlbum(dailyListen: DailyListens): Album | null {
  if (!dailyListen.albums.length) {
    return null;
  }

  // Priority 1: Album containing the favorite song
  if (dailyListen.favoriteSong) {
    const favoriteAlbum = dailyListen.albums.find(
      (a) => a.album.albumId === dailyListen.favoriteSong?.albumId,
    );
    if (favoriteAlbum) {
      return favoriteAlbum.album;
    }
  }

  // Priority 2: First album by listen order
  return dailyListen.albums[0]?.album ?? null;
}

/**
 * Sorts album listens with the favorite album first.
 *
 * If a favorite song is set, the album listen containing it is moved to the front.
 * Otherwise, album listens remain in their original order.
 *
 * @param albumListens - The album listens to sort
 * @param favoriteSong - The favorite song (if set)
 * @returns Album listens sorted with favorite first
 */
export function sortAlbumListensByFavorite(
  albumListens: DailyAlbumListen[],
  favoriteSong: DailyListens['favoriteSong'],
): DailyAlbumListen[] {
  if (!favoriteSong || albumListens.length <= 1) {
    return albumListens;
  }

  const favoriteIndex = albumListens.findIndex(
    (a) => a.album.albumId === favoriteSong.albumId,
  );

  if (favoriteIndex <= 0) {
    return albumListens;
  }

  // Move favorite to front
  const sorted = [...albumListens];
  const [favorite] = sorted.splice(favoriteIndex, 1);
  if (favorite) {
    sorted.unshift(favorite);
  }
  return sorted;
}

/**
 * Returns albums sorted with the favorite album first.
 *
 * If a favorite song is set, the album containing it is moved to the front.
 * Otherwise, albums remain in their original order.
 *
 * @param dailyListen - The day's listening data
 * @returns Albums sorted with favorite first
 */
export function getAlbumsSortedByFavorite(dailyListen: DailyListens): Album[] {
  return sortAlbumListensByFavorite(
    dailyListen.albums,
    dailyListen.favoriteSong,
  ).map((a) => a.album);
}
