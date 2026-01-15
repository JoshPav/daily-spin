import type { AddBacklogItemBody } from '#shared/schema';
import { BacklogRepository } from '../repositories/backlog.repository';

export class BacklogService {
  constructor(private backlogRepo = new BacklogRepository()) {}

  async getBacklog(userId: string) {
    return await this.backlogRepo.getBacklogItems(userId);
  }

  /**
   * Add multiple albums to backlog in bulk
   * Returns successfully added items and list of skipped album IDs
   */
  async addBacklogItems(userId: string, items: AddBacklogItemBody[]) {
    if (items.length === 0) {
      return { added: [], skipped: [] };
    }

    // Check which albums already exist
    const spotifyIds = items.map((item) => item.spotifyId);
    const existingIds = await this.backlogRepo.getExistingAlbumIds(
      userId,
      spotifyIds,
    );

    // Create items (repository will skip duplicates)
    const created = await this.backlogRepo.createBacklogItems(
      items.map((item) => ({
        userId,
        ...item,
      })),
    );

    return {
      added: created,
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
   * Get a random album suggestion from the backlog (used by background task)
   */
  async getRandomSuggestion(userId: string) {
    const backlogAlbums = await this.backlogRepo.getBacklogItems(userId);

    if (backlogAlbums.length === 0) {
      return null;
    }

    // Pick a random album from backlog
    const randomAlbum =
      backlogAlbums[Math.floor(Math.random() * backlogAlbums.length)];

    return {
      albumId: randomAlbum.spotifyId,
      albumName: randomAlbum.name,
      artistNames: randomAlbum.artistNames,
      imageUrl: randomAlbum.imageUrl || '',
      source: 'backlog' as const,
    };
  }
}
