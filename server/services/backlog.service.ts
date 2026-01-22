import type { AddBacklogItemBody, BacklogAlbum } from '#shared/schema';
import { BacklogRepository } from '~~/server/repositories/backlog.repository';
import { FutureListenRepository } from '~~/server/repositories/futureListen.repository';
import { createTaggedLogger } from '~~/server/utils/logger';

const logger = createTaggedLogger('Service:Backlog');

// Backlog scheduling types
export type ScheduledItem = {
  date: string; // ISO string
  albumId: string;
  albumName: string;
};

export type BacklogScheduleResult = {
  scheduled: ScheduledItem[];
  skipped: number; // Number of dates that couldn't be filled
};

export class BacklogService {
  constructor(
    private backlogRepo = new BacklogRepository(),
    private futureListenRepo = new FutureListenRepository(),
  ) {}

  /**
   * Map database BacklogItem (with relations) to API BacklogAlbum type
   */
  private mapToBacklogAlbum(
    item: Awaited<ReturnType<BacklogRepository['getBacklogItems']>>[number],
  ): BacklogAlbum {
    const artists = item.album.artists.map((aa) => ({
      spotifyId: aa.artist.spotifyId,
      name: aa.artist.name,
      imageUrl: aa.artist.imageUrl || undefined,
    }));

    return {
      id: item.id,
      spotifyId: item.album.spotifyId,
      name: item.album.name,
      imageUrl: item.album.imageUrl,
      artists,
      addedAt: item.createdAt.toISOString(),
    };
  }

  async getBacklog(userId: string): Promise<BacklogAlbum[]> {
    const items = await this.backlogRepo.getBacklogItems(userId);
    return items.map((item) => this.mapToBacklogAlbum(item));
  }

  /**
   * Add multiple albums to backlog in bulk
   * Returns successfully added items and list of skipped album IDs
   */
  async addBacklogItems(userId: string, items: AddBacklogItemBody[]) {
    if (items.length === 0) {
      return { added: [], skipped: [] };
    }

    logger.debug('Adding backlog items', {
      userId,
      itemCount: items.length,
    });

    // Check which albums already exist in the backlog
    const spotifyIds = items.map((item) => item.spotifyId);
    const existingIds = await this.backlogRepo.getExistingAlbumSpotifyIds(
      userId,
      spotifyIds,
    );

    // Filter out items that already exist
    const newItems = items.filter(
      (item) => !existingIds.includes(item.spotifyId),
    );

    logger.debug('Filtered existing items', {
      userId,
      newItemsCount: newItems.length,
      existingCount: existingIds.length,
    });

    // Create albums and artists first, then create backlog items
    const createdItems: BacklogAlbum[] = [];

    for (const item of newItems) {
      try {
        // Find or create the album with its artists
        const album = await this.backlogRepo.findOrCreateAlbum({
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

        // Create the backlog item
        const backlogItem = await this.backlogRepo.createBacklogItem(
          userId,
          album.id,
        );

        // Map to API type
        createdItems.push(this.mapToBacklogAlbum(backlogItem));
      } catch (error) {
        logger.error('Failed to add album to backlog', {
          userId,
          albumSpotifyId: item.spotifyId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Skip this item if there's an error
      }
    }

    logger.info('Successfully added backlog items', {
      userId,
      addedCount: createdItems.length,
      skippedCount: existingIds.length,
    });

    return {
      added: createdItems,
      skipped: existingIds,
    };
  }

  async removeBacklogItem(userId: string, itemId: string) {
    return await this.backlogRepo.deleteBacklogItem(itemId, userId);
  }

  /**
   * Remove multiple albums from backlog in bulk
   * Returns count of deleted items
   */
  async removeBacklogItems(userId: string, itemIds: string[]) {
    if (itemIds.length === 0) {
      return 0;
    }
    return await this.backlogRepo.deleteBacklogItems(itemIds, userId);
  }

  /**
   * Remove album from backlog by its Spotify ID
   * Used when an album is listened to, to auto-clean the backlog
   */
  async removeBacklogItemByAlbumSpotifyId(
    userId: string,
    albumSpotifyId: string,
  ) {
    return await this.backlogRepo.deleteBacklogItemByAlbumSpotifyId(
      userId,
      albumSpotifyId,
    );
  }

  /**
   * Get a random album suggestion from the backlog (used by background task)
   */
  async getRandomSuggestion(userId: string) {
    const backlogItems = await this.backlogRepo.getBacklogItems(userId);

    if (backlogItems.length === 0) {
      return null;
    }

    // Pick a random album from backlog
    const randomIndex = Math.floor(Math.random() * backlogItems.length);
    const randomItem = backlogItems[randomIndex];

    if (!randomItem) {
      return null;
    }

    const artistNames = randomItem.album.artists
      .map((aa) => aa.artist.name)
      .join(', ');

    return {
      albumId: randomItem.album.spotifyId,
      albumName: randomItem.album.name,
      artistNames,
      imageUrl: randomItem.album.imageUrl || '',
      source: 'backlog' as const,
    };
  }

  /**
   * Automatically schedule backlog albums to future listens
   * Uses weighted random selection favoring older items
   * Skips dates that already have schedules and albums already scheduled
   */
  async scheduleBacklogToFutureListens(
    userId: string,
    daysToSchedule = 7,
  ): Promise<BacklogScheduleResult> {
    logger.info('Scheduling backlog albums to future listens', {
      userId,
      daysToSchedule,
    });

    // Get next N days starting from tomorrow (UTC)
    const dates = this.getNextNDates(daysToSchedule);

    // Get existing future listens within the scheduling window
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const { items: existingSchedule } =
      await this.futureListenRepo.getFutureListensInRange(
        userId,
        startDate,
        endDate,
      );
    const scheduledDates = new Set(
      existingSchedule.map((fl) => fl.date.toISOString().split('T')[0]),
    );
    const scheduledAlbumIds = new Set(existingSchedule.map((fl) => fl.albumId));

    // Filter available dates (skip those with existing schedules)
    const availableDates = dates.filter(
      (date) => !scheduledDates.has(date.toISOString().split('T')[0]),
    );

    logger.debug('Available dates for scheduling', {
      userId,
      totalDates: dates.length,
      availableDates: availableDates.length,
    });

    // Schedule albums to dates
    const scheduled: ScheduledItem[] = [];
    const usedAlbumIds = new Set<string>(scheduledAlbumIds);

    for (const date of availableDates) {
      // Count eligible backlog items (exclude already used albums)
      const count = await this.backlogRepo.countUnscheduledBacklogItems(
        userId,
        Array.from(usedAlbumIds),
      );

      if (count === 0) break; // No more items to schedule

      // Get weighted random offset (biased toward older items)
      const offset = this.getWeightedRandomOffset(count);

      // Fetch one item at the offset
      const selected = await this.backlogRepo.getBacklogItemAtOffset(
        userId,
        Array.from(usedAlbumIds),
        offset,
      );

      if (!selected) break;

      try {
        await this.futureListenRepo.upsertFutureListen(
          userId,
          selected.albumId,
          date,
        );
        scheduled.push({
          date: date.toISOString(),
          albumId: selected.albumId,
          albumName: selected.album.name,
        });
        usedAlbumIds.add(selected.albumId);
      } catch (error) {
        logger.error('Failed to schedule album to future listen', {
          userId,
          albumId: selected.albumId,
          date: date.toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Continue with next date
      }
    }

    logger.info('Completed scheduling backlog albums', {
      userId,
      scheduledCount: scheduled.length,
      skippedCount: availableDates.length - scheduled.length,
    });

    return {
      scheduled,
      skipped: availableDates.length - scheduled.length,
    };
  }

  /**
   * Calculate weighted random offset using cubic weighting
   * Biases strongly toward higher indices (older items when ordered by createdAt DESC)
   */
  private getWeightedRandomOffset(count: number): number {
    if (count === 0) return 0;
    if (count === 1) return 0;

    // Cubic weighting: 1 - (1 - random)^3 biases strongly toward higher indices (older items)
    // When ordered by createdAt DESC, higher indices = older items (been in backlog longer)
    // This inverts the cube so values closer to 1 are more likely
    const random = Math.random();
    const weightedRandom = 1 - (1 - random) ** 3; // Inverted cube for strong bias toward higher values
    const offset = Math.floor(weightedRandom * count);

    return offset;
  }

  /**
   * Get the next N dates starting from tomorrow (UTC)
   */
  private getNextNDates(n: number): Date[] {
    const dates: Date[] = [];
    const today = new Date();

    for (let i = 1; i <= n; i++) {
      const date = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate() + i,
        ),
      );
      dates.push(date);
    }

    return dates;
  }
}
