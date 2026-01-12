import { UserRepository } from '../repositories/user.repository';

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
    const users = await this.userRepo.getUsersWithFeatureEnabled(
      'trackListeningHistory',
    );

    return users.map(({ accounts, id }) => ({ id, auth: accounts[0] }));
  }
}
