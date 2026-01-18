import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { getAccessToken } from '~/lib/auth-client';

export const useSpotifyApi = async () => {
  const {
    public: { spotifyClientId },
  } = useRuntimeConfig();

  const { data } = await getAccessToken({
    providerId: 'spotify',
  });

  if (!data) {
    return undefined;
  }

  const { accessToken, accessTokenExpiresAt } = data;

  const expiresIn = accessTokenExpiresAt
    ? (accessTokenExpiresAt.valueOf() - Date.now().valueOf()) / 1000
    : 3600;

  return SpotifyApi.withAccessToken(spotifyClientId, {
    access_token: accessToken,
    expires_in: expiresIn,
    refresh_token: '',
    token_type: '',
  });
};
