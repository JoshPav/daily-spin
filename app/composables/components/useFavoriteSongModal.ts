import { LazyFavoriteSongModal } from '#components';
import type { FavoriteSong } from '#shared/schema';

type OpenModalPayload = {
  albumListenId: string;
  albumId: string;
  albumName: string;
  currentFavoriteSong: FavoriteSong | null;
  onUpdated?: (favoriteSong: FavoriteSong | null) => void;
};

export const useFavoriteSongModal = () => {
  const overlay = useOverlay();
  const modal = overlay.create(LazyFavoriteSongModal);

  const open = ({
    albumListenId,
    albumId,
    albumName,
    currentFavoriteSong,
    onUpdated,
  }: OpenModalPayload) => {
    modal.open({
      albumListenId,
      albumId,
      albumName,
      currentFavoriteSong,
      onUpdated: (favoriteSong: FavoriteSong | null) => {
        onUpdated?.(favoriteSong);
      },
    });
  };

  return {
    open,
  };
};
