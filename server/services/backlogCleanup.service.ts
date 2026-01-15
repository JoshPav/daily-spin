import { BacklogRepository } from '../repositories/backlog.repository';

export class BacklogCleanupService {
  constructor(private backlogRepo = new BacklogRepository()) {}

  /**
   * Remove an album from backlog when user listens to it
   */
  async cleanupListenedAlbum(userId: string, albumId: string) {
    await this.backlogRepo.deleteBacklogItemByAlbumSpotifyId(userId, albumId);
  }
}
