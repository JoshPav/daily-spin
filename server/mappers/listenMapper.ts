import type { DailyListens } from '#shared/schema';
import type { DailyListenWithAlbums } from '../repositories/dailyListen.repository';

export const mapDailyListens = (
  dailyListens: DailyListenWithAlbums,
): DailyListens => ({
  date: dailyListens.date.toISOString(),
  albums: dailyListens.albums.map(
    ({ album, listenOrder, listenMethod, listenTime }) => ({
      album: {
        albumId: album.spotifyId,
        albumName: album.name,
        artistNames: album.artists.map((aa) => aa.artist.name).join(', '),
        imageUrl: album.imageUrl ?? '',
      },
      listenMetadata: {
        listenOrder,
        listenMethod,
        listenTime,
      },
    }),
  ),
});
