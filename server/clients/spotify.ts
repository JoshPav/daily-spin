import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import type { AuthDetails } from '../services/user.service';

export const getSpotifyClientForUser = ({
  accessToken,
  refreshToken,
}: AuthDetails) => {
  if (!accessToken || !refreshToken) {
    throw new Error('User tokens invalid');
  }

  return SpotifyApi.withAccessToken(useRuntimeConfig().spotifyClientId, {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: refreshToken,
  });
};
