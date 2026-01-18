import type { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { UserRepository } from '../repositories/user.repository';
import { SpotifyService } from '../services/spotify.service';
import { NotFoundError, UnauthorizedError } from './errors';
import { createTaggedLogger } from './logger';

const logger = createTaggedLogger('Util:SpotifyClient');

/**
 * Gets a Spotify API client and user ID for the given user
 */
export async function getSpotifyClientForUser(userId: string): Promise<{
  spotifyClient: SpotifyApi;
  spotifyUserId: string;
}> {
  logger.debug('Getting Spotify client for user', { userId });

  const userRepo = new UserRepository();
  const spotifyService = new SpotifyService();

  // Fetch user with auth details
  const user = await userRepo.getUser(userId);

  if (!user) {
    throw new NotFoundError('User', { userId });
  }

  const account = user.accounts[0];
  if (!account) {
    throw new UnauthorizedError('Spotify account not found', { userId });
  }

  const auth = {
    accessToken: account.accessToken,
    refreshToken: account.refreshToken,
    accessTokenExpiresAt: account.accessTokenExpiresAt,
    scope: account.scope,
  };

  // Get Spotify client
  const spotifyClient = await spotifyService.getClientForUser(userId, auth);

  // Get Spotify user ID
  const spotifyUser = await spotifyClient.currentUser.profile();
  const spotifyUserId = spotifyUser.id;

  logger.debug('Successfully created Spotify client', {
    userId,
    spotifyUserId,
  });

  return { spotifyClient, spotifyUserId };
}
