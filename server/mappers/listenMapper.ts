import type { DailyListens } from '#shared/schema';
import type { DailyListenWithAlbums } from '../repositories/dailyListen.repository';
import { toDateString } from '../utils/datetime.utils';

export const mapDailyListens = (
  dailyListens: DailyListenWithAlbums,
): DailyListens => ({
  date: toDateString(dailyListens.date),
  albums: dailyListens.albums.map(
    ({ id, album, listenOrder, listenMethod, listenTime }) => ({
      id,
      album: {
        albumId: album.spotifyId,
        albumName: album.name,
        artists: album.artists.map(({ artist: { name, spotifyId } }) => ({
          spotifyId,
          name,
        })),
        imageUrl: album.imageUrl ?? '',
        releaseDate: album.releaseDate ?? undefined,
      },
      listenMetadata: {
        listenOrder,
        listenMethod,
        listenTime,
      },
    }),
  ),
  favoriteSong: (() => {
    if (
      !dailyListens.favoriteSongId ||
      !dailyListens.favoriteSongName ||
      dailyListens.favoriteSongTrackNumber === null ||
      !dailyListens.favoriteSongAlbumId
    ) {
      return null;
    }
    // Find the album's Spotify ID from the albums array using the internal ID
    const albumListen = dailyListens.albums.find(
      (al) => al.album.id === dailyListens.favoriteSongAlbumId,
    );
    const albumSpotifyId = albumListen?.album.spotifyId;
    if (!albumSpotifyId) {
      return null;
    }
    return {
      spotifyId: dailyListens.favoriteSongId,
      name: dailyListens.favoriteSongName,
      trackNumber: dailyListens.favoriteSongTrackNumber,
      albumId: albumSpotifyId,
    };
  })(),
});
