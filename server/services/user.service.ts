import { UserRepository } from '../repositories/user.repository';
import { createTaggedLogger } from '../utils/logger';

const logger = createTaggedLogger('Service:User');

export type AuthDetails = {
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
  scope: string | null;
};

export type UserWithAuthTokens = {
  id: string;
  auth: AuthDetails;
};

export class UserService {
  constructor(private userRepo = new UserRepository()) {}

  async fetchUsersForRecentlyPlayedProcessing(): Promise<UserWithAuthTokens[]> {
    logger.debug('Fetching users for recently played processing');

    const users = await this.userRepo.getUsersWithFeatureEnabled(
      'trackListeningHistory',
    );

    const usersWithAuth = users
      .map(({ accounts, id }) => {
        const auth = accounts[0];
        return auth ? { id, auth } : null;
      })
      .filter((user): user is UserWithAuthTokens => user !== null);

    logger.debug('Fetched users with auth tokens', {
      userCount: usersWithAuth.length,
    });

    return usersWithAuth;
  }

  async fetchUsersForPlaylistCreation(): Promise<UserWithAuthTokens[]> {
    logger.debug('Fetching users for playlist creation');

    const users = await this.userRepo.getUsersWithFeatureEnabled(
      'createTodaysAlbumPlaylist',
    );

    const usersWithAuth = users
      .map(({ accounts, id }) => {
        const auth = accounts[0];
        return auth ? { id, auth } : null;
      })
      .filter((user): user is UserWithAuthTokens => user !== null);

    logger.debug('Fetched users for playlist creation', {
      userCount: usersWithAuth.length,
    });

    return usersWithAuth;
  }
}
