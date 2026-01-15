import type { AddFutureListenBody, FutureListenItem } from '#shared/schema';
import { FutureListenRepository } from '../repositories/futureListen.repository';

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
      date: item.date.toISOString(),
      album: {
        spotifyId: item.album.spotifyId,
        name: item.album.name,
        imageUrl: item.album.imageUrl,
        artists,
      },
    };
  }

  async getFutureListens(userId: string): Promise<FutureListenItem[]> {
    const items = await this.futureListenRepo.getFutureListens(userId);
    return items.map((item) => this.mapToFutureListenItem(item));
  }

  async addFutureListen(
    userId: string,
    item: AddFutureListenBody,
  ): Promise<FutureListenItem> {
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

    return this.mapToFutureListenItem(futureListen);
  }

  async removeFutureListen(userId: string, itemId: string) {
    return await this.futureListenRepo.deleteFutureListen(itemId, userId);
  }

  async removeFutureListenByDate(userId: string, date: Date) {
    return await this.futureListenRepo.deleteFutureListenByDate(userId, date);
  }
}
