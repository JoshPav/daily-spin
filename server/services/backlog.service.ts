import type { AddBacklogItemBody, BacklogAlbum } from '#shared/schema';
import { BacklogRepository } from '../repositories/backlog.repository';

export class BacklogService {
  constructor(private backlogRepo = new BacklogRepository()) {}

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
      createdAt: item.createdAt.toISOString(),
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
        console.error(
          `Error adding album ${item.spotifyId} to backlog:`,
          error,
        );
        // Skip this item if there's an error
      }
    }

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
}
