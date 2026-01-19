import { BacklogRepository } from '~~/server/repositories/backlog.repository';
import { createTaggedLogger } from '~~/server/utils/logger';

const logger = createTaggedLogger('Service:BacklogCleanup');

export class BacklogCleanupService {
  constructor(private backlogRepo = new BacklogRepository()) {}

  /**
   * Remove an album from backlog when user listens to it
   */
  async cleanupListenedAlbum(userId: string, albumId: string) {
    logger.debug('Cleaning up listened album from backlog', {
      userId,
      albumId,
    });

    await this.backlogRepo.deleteBacklogItemByAlbumSpotifyId(userId, albumId);

    logger.info('Cleaned up listened album from backlog', {
      userId,
      albumId,
    });
  }
}
