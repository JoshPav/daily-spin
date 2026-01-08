import type { Prisma } from '@prisma/client';
import type { DailyListens } from '#shared/schema';

export const mapDailyListens = (
  dailyListens: Prisma.DailyListenGetPayload<{
    include: { albums: true };
  }>,
): DailyListens => ({
  date: dailyListens.date.toISOString(),
  albums: dailyListens.albums.map((album) => ({
    albumId: album.albumId,
    listenMetadata: { inOrder: album.listenedInOrder },
  })),
});
