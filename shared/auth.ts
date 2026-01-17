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

export type SpotifyCredentials = {
  clientId: string;
  clientSecret: string;
};

/**
 * Refreshes a Spotify access token using the refresh token.
 * This is the centralized token refresh logic that can be called directly
 * for server-side batch processing.
 *
 * @param refreshToken - The refresh token to use
 * @param credentials - Optional credentials (defaults to useRuntimeConfig in Nuxt context)
 */
export async function refreshSpotifyToken(
  refreshToken: string,
  credentials?: SpotifyCredentials,
): Promise<SpotifyTokenRefreshResult> {
  // Use provided credentials or fall back to runtime config (for Nuxt server context)
  // biome-ignore lint/suspicious/noExplicitAny: useRuntimeConfig is globally available in Nuxt but not typed here
  const global = globalThis as any;
  const runtimeConfig = global.useRuntimeConfig?.();
  const creds = credentials ?? {
    clientId: runtimeConfig?.spotifyClientId ?? clientId,
    clientSecret: runtimeConfig?.spotifyClientSecret ?? clientSecret,
  };

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}`,
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
