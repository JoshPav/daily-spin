import type { BacklogType } from '@prisma/client';
import { BacklogRepository } from '../repositories/backlog.repository';

export class BacklogService {
  constructor(private backlogRepo = new BacklogRepository()) {}

  async getBacklog(userId: string) {
    return await this.backlogRepo.getBacklogItems(userId);
  }

  async getBacklogAlbums(userId: string) {
    return await this.backlogRepo.getBacklogAlbums(userId);
  }

  async getBacklogArtists(userId: string) {
    return await this.backlogRepo.getBacklogArtists(userId);
  }

  async addBacklogItem(
    userId: string,
    data: {
      type: BacklogType;
      spotifyId: string;
      name: string;
      imageUrl?: string;
      artistNames?: string;
    },
  ) {
    return await this.backlogRepo.createBacklogItem({
      userId,
      ...data,
    });
  }

  async removeBacklogItem(userId: string, itemId: string) {
    const item = await this.backlogRepo.getBacklogItemById(itemId, userId);

    if (!item) {
      return null;
    }

    return await this.backlogRepo.deleteBacklogItem(itemId, userId);
  }

  async removeBacklogItemBySpotifyId(
    userId: string,
    spotifyId: string,
    type: BacklogType,
  ) {
    return await this.backlogRepo.deleteBacklogItemBySpotifyId(
      userId,
      spotifyId,
      type,
    );
  }
}
