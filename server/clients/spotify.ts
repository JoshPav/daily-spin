import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { config } from 'dotenv';
import type { AuthDetails } from '../services/user.service';

// Nuxt doesn't always load .env.local for server utils, so load it explicitly
config({ path: '.env.local' });
config({ path: '.env' });

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;

if (!SPOTIFY_CLIENT_ID) {
  throw new Error('Spotify client id not set.');
}

export const getSpotifyClientForUser = ({
  accessToken,
  refreshToken,
}: AuthDetails) => {
  if (!accessToken || !refreshToken) {
    throw new Error('User tokens invalid');
  }

  return SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: refreshToken,
  });
};
