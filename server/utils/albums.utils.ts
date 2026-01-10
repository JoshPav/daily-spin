import type { SimplifiedAlbum } from '@spotify/web-api-ts-sdk';

const DESIRED_IMAGE_SIZE = 300;

export const getAlbumArtwork = (images: SimplifiedAlbum['images']) => {
  const desiredImage = images.find(
    (image) => image.width === DESIRED_IMAGE_SIZE,
  );

  return (desiredImage || images[0])?.url;
};
