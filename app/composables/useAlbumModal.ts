import { ref } from 'vue';
import type { Album, DailyAlbumListen } from '#shared/schema';

const isOpen = ref(false);

const album = ref<Album | null>(null);
const listenMetadata = ref<DailyAlbumListen['listenMetadata']>();
const date = ref<string | null>(null);

type OpenModalPayload = {
  date: string;
  album: Album;
  listenMetadata: DailyAlbumListen['listenMetadata'];
};

export const useAlbumModal = () => {
  const open = (payload: OpenModalPayload) => {
    album.value = payload.album;
    listenMetadata.value = payload.listenMetadata;
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
    setTimeout(() => {
      album.value = null;
      listenMetadata.value = undefined;
    }, 300);
  };

  const viewTransitionName = computed(() => {
    if (!album.value?.albumId || !date.value) return null;
    return `album-${album.value.albumId}-${date.value}`;
  });

  return {
    isOpen,
    album,
    listenMetadata,
    open,
    close,
    viewTransitionName,
  };
};
