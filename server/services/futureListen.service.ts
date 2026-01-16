import type { AddFutureListenBody, FutureListenItem } from '#shared/schema';
import { FutureListenRepository } from '../repositories/futureListen.repository';
import { createTaggedLogger } from '../utils/logger';

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
    logger.debug('Fetching future listens', { userId });

    const items = await this.futureListenRepo.getFutureListens(userId);

    logger.debug('Fetched future listens', {
      userId,
      count: items.length,
    });

    return items.map((item) => this.mapToFutureListenItem(item));
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
}
