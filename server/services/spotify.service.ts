import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { UserRepository } from '../repositories/user.repository';
import type { AuthDetails } from './user.service';

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
      throw new Error('User tokens invalid');
    }

    // Check if token is expired (with 5 minute buffer)
    const now = new Date();
    const expiryWithBuffer = accessTokenExpiresAt
      ? new Date(accessTokenExpiresAt.getTime() - 5 * 60 * 1000)
      : now;

    if (now >= expiryWithBuffer) {
      console.log('Access token expired, refreshing...');
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
      throw new Error('SPOTIFY_CLIENT_SECRET not configured');
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
        throw new Error(`Failed to refresh token: ${response.status} ${error}`);
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

      console.log('Access token refreshed successfully');

      return {
        accessToken: data.access_token,
        refreshToken, // Spotify doesn't always return a new refresh token
        accessTokenExpiresAt: expiresAt,
        scope: data.scope,
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error(
        `Failed to refresh Spotify access token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Creates a Spotify API client with the given auth details
   */
  private createSpotifyClient(auth: AuthDetails): SpotifyApi {
    const { accessToken, refreshToken } = auth;

    if (!accessToken || !refreshToken) {
      throw new Error('User tokens invalid');
    }

    return SpotifyApi.withAccessToken(useRuntimeConfig().spotifyClientId, {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
    });
  }
}
