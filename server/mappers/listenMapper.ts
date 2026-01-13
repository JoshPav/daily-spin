import type { Prisma } from '@prisma/client';
import type { DailyListens } from '#shared/schema';

export const mapDailyListens = (
  dailyListens: Prisma.DailyListenGetPayload<{
    include: { albums: true };
  }>,
): DailyListens => ({
  date: dailyListens.date.toISOString(),
  albums: dailyListens.albums.map(
    ({
      albumId,
      albumName,
      artistNames,
      imageUrl,
      listenOrder,
      listenMethod,
      listenTime,
    }) => ({
      album: {
        albumId,
        albumName,
        artistNames,
        imageUrl,
      },
      listenMetadata: {
        listenOrder,
        listenMethod,
        listenTime,
      },
    }),
  ),
});
