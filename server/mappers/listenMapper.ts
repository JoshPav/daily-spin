import type { DailyListens } from '#shared/schema';
import type { DailyListenWithAlbums } from '../repositories/dailyListen.repository';

export const mapDailyListens = (
  dailyListens: DailyListenWithAlbums,
): DailyListens => ({
  date: dailyListens.date.toISOString(),
  albums: dailyListens.albums.map(
    ({
      album,
      listenOrder,
      listenMethod,
      listenTime,
      favoriteSongId,
      favoriteSongName,
    }) => ({
      album: {
        albumId: album.spotifyId,
        albumName: album.name,
        artists: album.artists.map(({ artist: { name, spotifyId } }) => ({
          spotifyId,
          name,
        })),
        imageUrl: album.imageUrl ?? '',
      },
      listenMetadata: {
        listenOrder,
        listenMethod,
        listenTime,
        favoriteSong:
          favoriteSongId && favoriteSongName
            ? { spotifyId: favoriteSongId, name: favoriteSongName }
            : null,
      },
    }),
  ),
});
