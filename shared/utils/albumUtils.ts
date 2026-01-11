import type { Artist } from '@spotify/web-api-ts-sdk';

export const getAlbumArtists = (artists: Pick<Artist, 'name'>[]) =>
  artists.map((a) => a.name).join(', ');
