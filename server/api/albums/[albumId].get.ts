import type { Album } from '@spotify/web-api-ts-sdk';

export default defineEventHandler<Promise<Album>>(async (event) => {
  const albumId = getRouterParam(event, 'albumId');

  if (!albumId) {
    throw createError({
      statusCode: 400,
      message: 'Album ID is required',
    });
  }

  const config = useRuntimeConfig();
  const accessToken = config.spotifyAccessToken;

  if (!accessToken) {
    throw createError({
      statusCode: 500,
      message: 'Spotify access token not configured',
    });
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/albums/${albumId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        message: `Spotify API error: ${response.statusText}`,
      });
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching album:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch album from Spotify',
    });
  }
});
