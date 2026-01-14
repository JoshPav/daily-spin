import type { BacklogType, PrismaClient } from '@prisma/client';
import prisma from '../clients/prisma';

export type CreateBacklogItem = {
  userId: string;
  type: BacklogType;
  spotifyId: string;
  name: string;
  imageUrl?: string;
  artistNames?: string;
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

  async getBacklogAlbums(userId: string) {
    return await this.prismaClient.backlogItem.findMany({
      where: { userId, type: 'album' },
      orderBy: { addedAt: 'desc' },
    });
  }

  async getBacklogArtists(userId: string) {
    return await this.prismaClient.backlogItem.findMany({
      where: { userId, type: 'artist' },
      orderBy: { addedAt: 'desc' },
    });
  }

  async createBacklogItem(data: CreateBacklogItem) {
    return await this.prismaClient.backlogItem.create({
      data,
    });
  }

  async deleteBacklogItem(id: string, userId: string) {
    return await this.prismaClient.backlogItem.delete({
      where: { id, userId },
    });
  }

  async deleteBacklogItemBySpotifyId(
    userId: string,
    spotifyId: string,
    type: BacklogType,
  ) {
    return await this.prismaClient.backlogItem.deleteMany({
      where: { userId, spotifyId, type },
    });
  }

  async hasBacklogItem(userId: string, spotifyId: string, type: BacklogType) {
    const count = await this.prismaClient.backlogItem.count({
      where: { userId, spotifyId, type },
    });
    return count > 0;
  }
}
