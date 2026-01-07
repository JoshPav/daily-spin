import type { AsyncData } from '#app';
import type { Album } from '@spotify/web-api-ts-sdk';

export const useAlbum = (
  albumId: string | undefined,
): AsyncData<Album | undefined, unknown> => {
  // const spotify = useSpotify();

  return useFetch<Album>(`https://api.spotify.com/v1/albums/${albumId}`, {
    headers: {
      authorization: `Bearer BQAliEtvBDFn66QgHCel7KAO-jlNnNGCPnCMVvDNc2kItMMFirTqjRaWe7L4CYoaKFtDudZMFIG3bBpD4a9jwDxkIaFhpaHsdu4PkCZidXkILtWRENhksOHUZ64-6Pb7JgeVKNUCWPdWpfgsRnGJUzlYrxRZeB_Q7WONuG8odGbcbdpDTgsSQkb3TIch3pDy1rU-re6Z0dfnuN93EgC192sFpJ3_kyhjg3_ZAuW7JIlotpKBqY2KnwGp2w37-DXAvyFboqv5iqWslCUc99wwLfXfgZHDM8NjRRwWi5EthB-gEZNMFnHD4BGlIHMqi-gZErfJcy4Hl6kw2qXWErb5uPHi73Qxs6lw1N-XDR4iIpLKPxg2um7tmRvVWRsJZN5RW166eP8`,
    },
  });
};
