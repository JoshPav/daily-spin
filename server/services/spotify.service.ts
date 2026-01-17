import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { auth, refreshSpotifyToken } from '~~/shared/auth';
import { UserRepository } from '../repositories/user.repository';
import { ExternalServiceError, UnauthorizedError } from '../utils/errors';
import { createTaggedLogger, filterSensitiveData } from '../utils/logger';
import type { AuthDetails } from './user.service';

const logger = createTaggedLogger('Service:Spotify');

export class SpotifyService {
  constructor(private userRepo = new UserRepository()) {}

  /**
   * Gets a Spotify API client for the user, using BetterAuth to handle token refresh.
   * BetterAuth's getAccessToken API automatically refreshes expired tokens.
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

    const accessToken = await this.getAccessTokenViaBetterAuth(
      userId,
      refreshToken,
    );

    return this.createSpotifyClient(accessToken, refreshToken);
  }

  /**
   * Gets a fresh access token using BetterAuth's getAccessToken API.
   * This automatically handles token refresh if the token is expired.
   */
  private async getAccessTokenViaBetterAuth(
    userId: string,
    refreshToken: string,
  ): Promise<string> {
    try {
      logger.debug(
        'Calling BetterAuth getAccessToken',
        filterSensitiveData({ userId }),
      );

      const response = await auth.api.getAccessToken({
        body: {
          providerId: 'spotify',
        },
        query: {
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

      // Fallback to manual refresh using our utility function
      return this.fallbackRefresh(userId, refreshToken);
    }
  }

  /**
   * Fallback token refresh using the manual refreshSpotifyToken function.
   * Used when BetterAuth's getAccessToken fails.
   */
  private async fallbackRefresh(
    userId: string,
    refreshToken: string,
  ): Promise<string> {
    logger.debug(
      'Attempting fallback Spotify token refresh',
      filterSensitiveData({
        userId,
        refreshToken,
      }),
    );

    try {
      const result = await refreshSpotifyToken(refreshToken);

      // Calculate expiry time
      const expiresAt = new Date(Date.now() + result.expiresIn * 1000);

      // Log if Spotify returned a new refresh token (important for debugging)
      if (result.refreshToken && result.refreshToken !== refreshToken) {
        logger.warn(
          'Spotify returned a new refresh token - token rotation detected',
          filterSensitiveData({
            userId,
            oldRefreshToken: refreshToken,
            newRefreshToken: result.refreshToken,
          }),
        );
      }

      logger.debug(
        'Fallback token refresh successful',
        filterSensitiveData({
          userId,
          accessToken: result.accessToken,
          expiresAt: expiresAt.toISOString(),
          scope: result.scope,
          hasNewRefreshToken: !!result.refreshToken,
        }),
      );

      // Update tokens in database
      await this.userRepo.updateUserTokens(userId, {
        accessToken: result.accessToken,
        accessTokenExpiresAt: expiresAt,
        scope: result.scope,
      });

      logger.info('Access token refreshed successfully via fallback', {
        userId,
        expiresAt: expiresAt.toISOString(),
      });

      return result.accessToken;
    } catch (error) {
      // Extract Spotify-specific error details if available
      const spotifyError =
        error && typeof error === 'object' && 'spotifyError' in error
          ? (error as { spotifyError: string }).spotifyError
          : undefined;
      const spotifyErrorDescription =
        error && typeof error === 'object' && 'spotifyErrorDescription' in error
          ? (error as { spotifyErrorDescription: string })
              .spotifyErrorDescription
          : undefined;
      const status =
        error && typeof error === 'object' && 'status' in error
          ? (error as { status: number }).status
          : undefined;

      logger.error('Failed to refresh access token', {
        userId,
        status,
        spotifyError,
        spotifyErrorDescription,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw new ExternalServiceError('Spotify', 'refresh token', {
        userId,
        status,
        spotifyError,
        spotifyErrorDescription,
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
