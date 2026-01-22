import { addDays } from 'date-fns';
import type {
  AddFutureListenBody,
  FutureListenItem,
  FutureListensPagination,
} from '#shared/schema';
import { FutureListenRepository } from '~~/server/repositories/futureListen.repository';
import { toDateString } from '~~/server/utils/datetime.utils';
import { createTaggedLogger } from '~~/server/utils/logger';

const logger = createTaggedLogger('Service:FutureListen');

export class FutureListenService {
  constructor(private futureListenRepo = new FutureListenRepository()) {}

  /**
   * Map database FutureListen (with relations) to API FutureListenItem type
   */
  private mapToFutureListenItem(
    item: Awaited<
      ReturnType<FutureListenRepository['getFutureListens']>
    >[number],
  ): FutureListenItem {
    const artists = item.album.artists.map((aa) => ({
      spotifyId: aa.artist.spotifyId,
      name: aa.artist.name,
      imageUrl: aa.artist.imageUrl || undefined,
    }));

    return {
      id: item.id,
      date: toDateString(item.date),
      album: {
        spotifyId: item.album.spotifyId,
        name: item.album.name,
        imageUrl: item.album.imageUrl,
        artists,
      },
    };
  }

  /**
   * Get future listens for a user within a date range with pagination
   * Returns a date-keyed object with all dates in range (null for empty days)
   */
  async getFutureListensPaginated(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    items: Record<string, FutureListenItem | null>;
    pagination: FutureListensPagination;
  }> {
    logger.debug('Fetching paginated future listens', {
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    const { items, total, hasMore } =
      await this.futureListenRepo.getFutureListensPaginated(
        userId,
        startDate,
        endDate,
      );

    // Map items to response types with date as key
    const itemsByDate = new Map<string, FutureListenItem>();
    for (const item of items) {
      const mapped = this.mapToFutureListenItem(item);
      itemsByDate.set(mapped.date, mapped);
    }

    // Build date-keyed object with all dates in range (null for empty days)
    const result: Record<string, FutureListenItem | null> = {};
    let currentDate = startDate;
    while (currentDate <= endDate) {
      const dateKey = toDateString(currentDate);
      result[dateKey] = itemsByDate.get(dateKey) ?? null;
      currentDate = addDays(currentDate, 1);
    }

    logger.debug('Successfully fetched paginated future listens', {
      userId,
      total,
      hasMore,
    });

    return {
      items: result,
      pagination: {
        startDate: toDateString(startDate),
        endDate: toDateString(endDate),
        total,
        hasMore,
      },
    };
  }

  async addFutureListen(
    userId: string,
    item: AddFutureListenBody,
  ): Promise<FutureListenItem> {
    logger.info('Adding future listen', {
      userId,
      albumSpotifyId: item.spotifyId,
      date: item.date,
    });

    // Find or create the album with its artists
    const album = await this.futureListenRepo.findOrCreateAlbum({
      spotifyId: item.spotifyId,
      name: item.name,
      imageUrl: item.imageUrl,
      releaseDate: item.releaseDate,
      totalTracks: item.totalTracks,
      artists: item.artists.map((artist) => ({
        spotifyId: artist.spotifyId,
        name: artist.name,
        imageUrl: artist.imageUrl,
      })),
    });

    // Create or update the future listen
    const futureListen = await this.futureListenRepo.upsertFutureListen(
      userId,
      album.id,
      new Date(item.date),
    );

    logger.info('Successfully added future listen', {
      userId,
      futureListenId: futureListen.id,
    });

    return this.mapToFutureListenItem(futureListen);
  }

  async removeFutureListen(userId: string, itemId: string) {
    logger.info('Removing future listen', {
      userId,
      futureListenId: itemId,
    });

    const result = await this.futureListenRepo.deleteFutureListen(
      itemId,
      userId,
    );

    logger.info('Successfully removed future listen', {
      userId,
      futureListenId: itemId,
    });

    return result;
  }

  async removeFutureListenByDate(userId: string, date: Date) {
    logger.info('Removing future listen by date', {
      userId,
      date: date.toISOString(),
    });

    const result = await this.futureListenRepo.deleteFutureListenByDate(
      userId,
      date,
    );

    logger.info('Successfully removed future listen by date', {
      userId,
      date: date.toISOString(),
    });

    return result;
  }

  /**
   * Remove future listen by album Spotify ID
   * Used when an album is listened to, to auto-clean scheduled listens
   */
  async removeFutureListenByAlbumSpotifyId(
    userId: string,
    albumSpotifyId: string,
  ) {
    return await this.futureListenRepo.deleteFutureListenByAlbumSpotifyId(
      userId,
      albumSpotifyId,
    );
  }
}
