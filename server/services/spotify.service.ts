import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { UserRepository } from '../repositories/user.repository';
import {
  ExternalServiceError,
  UnauthorizedError,
  ValidationError,
} from '../utils/errors';
import { createTaggedLogger } from '../utils/logger';
import type { AuthDetails } from './user.service';

const logger = createTaggedLogger('Service:Spotify');

type TokenRefreshResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

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
   * Refreshes the access token using the refresh token
   */
  private async refreshAccessToken(
    userId: string,
    refreshToken: string,
  ): Promise<AuthDetails> {
    const config = useRuntimeConfig();
    const { spotifyClientId, spotifyClientSecret } = config;

    if (!spotifyClientSecret) {
      throw new ValidationError('SPOTIFY_CLIENT_SECRET not configured', {
        userId,
      });
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ExternalServiceError('Spotify', 'refresh token', {
          userId,
          status: response.status,
          error,
        });
      }

      const data: TokenRefreshResponse = await response.json();

      // Calculate expiry time
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);

      // Update tokens in database
      await this.userRepo.updateUserTokens(userId, {
        accessToken: data.access_token,
        accessTokenExpiresAt: expiresAt,
        scope: data.scope,
      });

      logger.info('Access token refreshed successfully', {
        userId,
        expiresAt: expiresAt.toISOString(),
      });

      return {
        accessToken: data.access_token,
        refreshToken, // Spotify doesn't always return a new refresh token
        accessTokenExpiresAt: expiresAt,
        scope: data.scope,
      };
    } catch (error) {
      logger.error('Failed to refresh access token', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Re-throw if already our custom error
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      // Wrap unexpected errors
      throw new ExternalServiceError('Spotify', 'refresh token', {
        userId,
        originalError: error instanceof Error ? error.message : 'Unknown error',
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
