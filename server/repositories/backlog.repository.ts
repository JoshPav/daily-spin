import type { PrismaClient } from '@prisma/client';
import prisma from '../clients/prisma';

export type CreateBacklogItem = {
  userId: string;
  spotifyId: string;
  name: string;
  imageUrl?: string;
  artistNames: string;
  addedFromArtistId?: string;
  addedFromArtistName?: string;
};

export class BacklogRepository {
  constructor(private prismaClient: PrismaClient = prisma) {}

  async getBacklogItems(userId: string) {
    return await this.prismaClient.backlogItem.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
    });
  }

  async getBacklogItemById(id: string, userId: string) {
    return await this.prismaClient.backlogItem.findFirst({
      where: { id, userId },
    });
  }

  /**
   * Bulk create backlog items using createMany with skipDuplicates
   * Returns items that were successfully created (duplicates are skipped)
   */
  async createBacklogItems(items: CreateBacklogItem[]) {
    if (items.length === 0) return [];

    const userId = items[0].userId;

    // Create items, skip duplicates based on userId + spotifyId unique constraint
    await this.prismaClient.backlogItem.createMany({
      data: items,
      skipDuplicates: true,
    });

    // Fetch newly created items to return
    const spotifyIds = items.map((item) => item.spotifyId);
    return await this.prismaClient.backlogItem.findMany({
      where: {
        userId,
        spotifyId: { in: spotifyIds },
      },
    });
  }

  async deleteBacklogItem(id: string, userId: string) {
    return await this.prismaClient.backlogItem.delete({
      where: { id, userId },
    });
  }

  async deleteBacklogItemBySpotifyId(userId: string, spotifyId: string) {
    return await this.prismaClient.backlogItem.deleteMany({
      where: { userId, spotifyId },
    });
  }

  async hasBacklogItem(userId: string, spotifyId: string) {
    const count = await this.prismaClient.backlogItem.count({
      where: { userId, spotifyId },
    });
    return count > 0;
  }

  /**
   * Get album IDs that are already in the backlog
   * Used to determine which items were skipped in bulk operations
   */
  async getExistingAlbumIds(userId: string, spotifyIds: string[]) {
    const existing = await this.prismaClient.backlogItem.findMany({
      where: {
        userId,
        spotifyId: { in: spotifyIds },
      },
      select: { spotifyId: true },
    });
    return existing.map((item) => item.spotifyId);
  }

  /**
   * Bulk delete backlog items by IDs
   * Returns count of deleted items
   */
  async deleteBacklogItems(ids: string[], userId: string) {
    const result = await this.prismaClient.backlogItem.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });
    return result.count;
  }
}
