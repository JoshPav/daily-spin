import { SpotifyApi } from '@spotify/web-api-ts-sdk';

export const useSpotify = () => {
  const config = useRuntimeConfig();
  const token = config.public.spotifyAccessToken as string;

  if (!token) {
    throw new Error('Spotify access token is not configured');
  }

  const spotify = SpotifyApi.withAccessToken('', {
    access_token: token,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: '',
  });

  return spotify;
};
