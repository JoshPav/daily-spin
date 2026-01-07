import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { config } from 'dotenv';

// Nuxt doesn't always load .env.local for server utils, so load it explicitly
config({ path: '.env.local' });
config({ path: '.env' });

let instance: SpotifyApi;

const SPOTIFY_ACCESS_TOKEN = process.env.NUXT_PUBLIC_SPOTIFY_ACCESS_TOKEN;

export const getSpotifyApiClient = (): SpotifyApi => {
  if (!instance) {
    if (!SPOTIFY_ACCESS_TOKEN) {
      throw new Error(
        'NUXT_PUBLIC_SPOTIFY_ACCESS_TOKEN is not set in environment variables',
      );
    }

    instance = SpotifyApi.withAccessToken('', {
      access_token: SPOTIFY_ACCESS_TOKEN,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: '',
    });
  }

  return instance;
};
