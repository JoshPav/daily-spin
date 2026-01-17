import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from '../server/clients/prisma';

const clientId = process.env.SPOTIFY_CLIENT_ID || '';
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
const baseUrl = process.env.BASE_URL || '';

export type SpotifyTokenRefreshResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
};

export type SpotifyTokenRefreshError = {
  error: string;
  error_description?: string;
};

/**
 * Refreshes a Spotify access token using the refresh token.
 * This is the centralized token refresh logic used by BetterAuth and can also
 * be called directly for server-side batch processing.
 */
export async function refreshSpotifyToken(
  refreshToken: string,
): Promise<SpotifyTokenRefreshResult> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorJson: SpotifyTokenRefreshError = { error: 'unknown_error' };
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      errorJson = { error: 'parse_error', error_description: errorText };
    }
    throw Object.assign(new Error(`Token refresh failed: ${response.status}`), {
      status: response.status,
      spotifyError: errorJson.error,
      spotifyErrorDescription: errorJson.error_description,
    });
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token, // May be undefined - Spotify sometimes returns a new one
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  session: {
    cookieCache: {
      enabled: true,
      strategy: 'jwt',
    },
  },
  socialProviders: {
    spotify: {
      clientId,
      clientSecret,
      scope: [
        'user-read-recently-played',
        'playlist-modify-public',
        'playlist-modify-private',
      ],
      redirectURI: `${baseUrl}/api/auth/callback/spotify`,
    },
  },
});
