import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { auth } from '~~/shared/auth';
import { ExternalServiceError, UnauthorizedError } from '../utils/errors';
import { createTaggedLogger, filterSensitiveData } from '../utils/logger';
import type { AuthDetails } from './user.service';

const logger = createTaggedLogger('Service:Spotify');

export class SpotifyService {
  /**
   * Gets a Spotify API client for the user, using BetterAuth to handle token refresh.
   */
  async getClientForUser(
    userId: string,
    auth: AuthDetails,
  ): Promise<SpotifyApi> {
    const { refreshToken } = auth;

    if (!refreshToken) {
      throw new UnauthorizedError('User refresh token missing', {
        userId,
        hasRefreshToken: false,
      });
    }

    logger.debug('Getting access token via BetterAuth', { userId });

    const accessToken = await this.getAccessTokenViaBetterAuth(userId);

    return this.createSpotifyClient(accessToken, refreshToken);
  }

  private async getAccessTokenViaBetterAuth(userId: string): Promise<string> {
    try {
      logger.debug(
        'Calling BetterAuth getAccessToken',
        filterSensitiveData({ userId }),
      );

      const response = await auth.api.getAccessToken({
        body: {
          providerId: 'spotify',
          userId,
        },
      });

      if (!response?.accessToken) {
        throw new Error('No access token returned from BetterAuth');
      }

      logger.debug(
        'BetterAuth getAccessToken successful',
        filterSensitiveData({
          userId,
          accessToken: response.accessToken,
        }),
      );

      return response.accessToken;
    } catch (error) {
      logger.warn(
        'BetterAuth getAccessToken failed, falling back to manual refresh',
        {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );

      throw new ExternalServiceError('Spotify', 'refresh_token', {
        error,
        userId,
      });
    }
  }

  /**
   * Creates a Spotify API client with the given tokens
   */
  private createSpotifyClient(
    accessToken: string,
    refreshToken: string,
  ): SpotifyApi {
    return SpotifyApi.withAccessToken(useRuntimeConfig().spotifyClientId, {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
    });
  }
}
