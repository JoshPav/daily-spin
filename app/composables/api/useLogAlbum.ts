import type { Ref } from 'vue';
import { ref } from 'vue';
import type { ListenMethod, ListenTime } from '#shared/schema';
import { getTrackListenTime } from '~/utils/listenTime.utils';
import type { SearchResult } from './useSpotifyAlbumSearch';

type UseLogAlbumProps = { date: Ref<Date | undefined>; onSuccess?: () => void };

export const useLogAlbum = ({
  date,
  onSuccess = () => {},
}: UseLogAlbumProps) => {
  const selectedAlbum = ref<SearchResult | undefined>(undefined);
  const listenedInOrder = ref(true);
  const listenMethod = ref<ListenMethod>('spotify');
  const listenTime = ref<ListenTime>(
    getTrackListenTime(new Date().toISOString()),
  );

  const saving = ref(false);

  const resetForm = () => {
    selectedAlbum.value = undefined;
    listenedInOrder.value = true;
    listenMethod.value = 'spotify';
    listenTime.value = getTrackListenTime(new Date().toISOString());
  };

  const logAlbumListen = async () => {
    console.log({ date });
    if (!selectedAlbum.value || !date.value) return;

    saving.value = true;

    try {
      await $fetch('/api/listens', {
        method: 'POST',
        body: {
          date: date.value.toISOString(),
          album: {
            albumId: selectedAlbum.value.id,
            albumName: selectedAlbum.value.name,
            artistNames: selectedAlbum.value.artists
              .map((a) => a.name)
              .join(', '),
            imageUrl: selectedAlbum.value.images[0]?.url || '',
          },
          listenMetadata: {
            inOrder: listenedInOrder.value,
            listenMethod: listenMethod.value,
            listenTime: listenTime.value,
          },
        },
      });

      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Failed to save album listen:', error);
    } finally {
      saving.value = false;
    }
  };

  return {
    selectedAlbum,
    listenedInOrder,
    listenMethod,
    listenTime,
    saving,
    logAlbumListen,
  };
};
