import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { UserRepository } from '~~/server/repositories/user.repository';
import { PushService } from '~~/server/services/push.service';
import type { AuthDetails } from '~~/server/services/user.service';
import {
  ExternalServiceError,
  UnauthorizedError,
} from '~~/server/utils/errors';
import {
  createTaggedLogger,
  filterSensitiveData,
} from '~~/server/utils/logger';
import { auth } from '~~/shared/auth';

const logger = createTaggedLogger('Service:Spotify');

export class SpotifyService {
  constructor(private userRepository: UserRepository = new UserRepository()) {}

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
      const isInvalidGrant = this.isInvalidGrantError(error);

      if (isInvalidGrant) {
        logger.warn(
          'Token refresh failed with invalid_grant, marking account for reauth',
          {
            userId,
          },
        );
        await this.userRepository.setSpotifyRequiresReauth(userId, true);

        // Send push notification to user
        try {
          const pushService = new PushService();
          await pushService.sendToUser(userId, {
            title: 'Spotify Connection Expired',
            body: 'Tap to reconnect your Spotify account.',
            data: { type: 'reauth', url: '/' },
            actions: [{ action: 'reauth', title: 'Reconnect' }],
          });
        } catch (pushError) {
          logger.warn('Failed to send reauth push notification', {
            userId,
            error:
              pushError instanceof Error ? pushError.message : 'Unknown error',
          });
        }
      }

      logger.warn('BetterAuth getAccessToken failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        isInvalidGrant,
      });

      throw new ExternalServiceError('Spotify', 'refresh_token', {
        error,
        userId,
        requiresReauth: isInvalidGrant,
      });
    }
  }

  private isInvalidGrantError(error: unknown): boolean {
    if (!error) return false;

    const errorStr = JSON.stringify(error).toLowerCase();
    return (
      errorStr.includes('invalid_grant') || errorStr.includes('invalid grant')
    );
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
