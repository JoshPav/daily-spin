import { addDays } from 'date-fns';
import type {
  AddScheduledListenBody,
  ScheduledListenItem,
  ScheduledListensPagination,
} from '#shared/schema';
import { ScheduledListenRepository } from '~~/server/repositories/scheduledListen.repository';
import { toDateString } from '~~/server/utils/datetime.utils';
import { createTaggedLogger } from '~~/server/utils/logger';

const logger = createTaggedLogger('Service:ScheduledListen');

export class ScheduledListenService {
  constructor(private scheduledListenRepo = new ScheduledListenRepository()) {}

  /**
   * Map database ScheduledListen (with relations) to API ScheduledListenItem type
   */
  private mapToScheduledListenItem(
    item: Awaited<
      ReturnType<ScheduledListenRepository['getScheduledListensInRange']>
    >['items'][number],
  ): ScheduledListenItem {
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
   * Get scheduled listens for a user within a date range with pagination
   * Returns a date-keyed object with all dates in range (null for empty days)
   */
  async getScheduledListensPaginated(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    items: Record<string, ScheduledListenItem | null>;
    pagination: ScheduledListensPagination;
  }> {
    logger.debug('Fetching paginated scheduled listens', {
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    const { items, total, hasMore } =
      await this.scheduledListenRepo.getScheduledListensInRange(
        userId,
        startDate,
        endDate,
      );

    // Map items to response types with date as key
    const itemsByDate = new Map<string, ScheduledListenItem>();
    for (const item of items) {
      const mapped = this.mapToScheduledListenItem(item);
      itemsByDate.set(mapped.date, mapped);
    }

    // Build date-keyed object with all dates in range (null for empty days)
    const result: Record<string, ScheduledListenItem | null> = {};
    let currentDate = startDate;
    while (currentDate <= endDate) {
      const dateKey = toDateString(currentDate);
      result[dateKey] = itemsByDate.get(dateKey) ?? null;
      currentDate = addDays(currentDate, 1);
    }

    logger.debug('Successfully fetched paginated scheduled listens', {
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

  async addScheduledListen(
    userId: string,
    item: AddScheduledListenBody,
  ): Promise<ScheduledListenItem> {
    logger.info('Adding scheduled listen', {
      userId,
      albumSpotifyId: item.spotifyId,
      date: item.date,
    });

    // Find or create the album with its artists
    const album = await this.scheduledListenRepo.findOrCreateAlbum({
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

    // Create or update the scheduled listen
    const scheduledListen =
      await this.scheduledListenRepo.upsertScheduledListen(
        userId,
        album.id,
        new Date(item.date),
      );

    logger.info('Successfully added scheduled listen', {
      userId,
      scheduledListenId: scheduledListen.id,
    });

    return this.mapToScheduledListenItem(scheduledListen);
  }

  async removeScheduledListen(userId: string, itemId: string) {
    logger.info('Removing scheduled listen', {
      userId,
      scheduledListenId: itemId,
    });

    const result = await this.scheduledListenRepo.deleteScheduledListen(
      itemId,
      userId,
    );

    logger.info('Successfully removed scheduled listen', {
      userId,
      scheduledListenId: itemId,
    });

    return result;
  }

  async removeScheduledListenByDate(userId: string, date: Date) {
    logger.info('Removing scheduled listen by date', {
      userId,
      date: date.toISOString(),
    });

    const result = await this.scheduledListenRepo.deleteScheduledListenByDate(
      userId,
      date,
    );

    logger.info('Successfully removed scheduled listen by date', {
      userId,
      date: date.toISOString(),
    });

    return result;
  }

  /**
   * Remove scheduled listen by album Spotify ID
   * Used when an album is listened to, to auto-clean scheduled listens
   */
  async removeScheduledListenByAlbumSpotifyId(
    userId: string,
    albumSpotifyId: string,
  ) {
    return await this.scheduledListenRepo.deleteScheduledListenByAlbumSpotifyId(
      userId,
      albumSpotifyId,
    );
  }
}
