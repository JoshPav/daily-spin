import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { refreshSpotifyToken } from '~~/shared/auth';
import { UserRepository } from '../repositories/user.repository';
import { ExternalServiceError, UnauthorizedError } from '../utils/errors';
import { createTaggedLogger, filterSensitiveData } from '../utils/logger';
import type { AuthDetails } from './user.service';

const logger = createTaggedLogger('Service:Spotify');

export class SpotifyService {
  constructor(private userRepo = new UserRepository()) {}

  /**
   * Gets a Spotify API client for the user, automatically refreshing the token if expired
   */
  async getClientForUser(
    userId: string,
    auth: AuthDetails,
  ): Promise<SpotifyApi> {
    const { accessToken, refreshToken, accessTokenExpiresAt } = auth;

    if (!accessToken || !refreshToken) {
      throw new UnauthorizedError('User tokens invalid', {
        userId,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
      });
    }

    // Check if token is expired (with 5 minute buffer)
    const now = new Date();
    const expiryWithBuffer = accessTokenExpiresAt
      ? new Date(accessTokenExpiresAt.getTime() - 5 * 60 * 1000)
      : now;

    if (now >= expiryWithBuffer) {
      logger.info('Access token expired, refreshing', {
        userId,
        expiresAt: accessTokenExpiresAt?.toISOString(),
      });
      const newAuth = await this.refreshAccessToken(userId, refreshToken);
      return this.createSpotifyClient(newAuth);
    }

    return this.createSpotifyClient(auth);
  }

  /**
   * Refreshes the access token using the refresh token via BetterAuth's
   * centralized token refresh logic.
   */
  private async refreshAccessToken(
    userId: string,
    refreshToken: string,
  ): Promise<AuthDetails> {
    logger.debug(
      'Attempting Spotify token refresh',
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
        'Spotify token refresh successful',
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

      logger.info('Access token refreshed successfully', {
        userId,
        expiresAt: expiresAt.toISOString(),
      });

      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken ?? refreshToken,
        accessTokenExpiresAt: expiresAt,
        scope: result.scope,
      };
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
   * Creates a Spotify API client with the given auth details
   */
  private createSpotifyClient(auth: AuthDetails): SpotifyApi {
    const { accessToken, refreshToken } = auth;

    if (!accessToken || !refreshToken) {
      throw new UnauthorizedError('User tokens invalid', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
      });
    }

    return SpotifyApi.withAccessToken(useRuntimeConfig().spotifyClientId, {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
    });
  }
}
