import type { ListenMethod } from '#shared/schema';

type UseLogAlbumProps = { date: Ref<Date | undefined>; onSuccess?: () => void };

export const useLogAlbum = ({
  date,
  onSuccess = () => {},
}: UseLogAlbumProps) => {
  const selectedAlbum = ref<SearchResult | undefined>(undefined);
  const listenedInOrder = ref(true);
  const listenMethod = ref<ListenMethod>('spotify');

  const saving = ref(false);

  const resetForm = () => {
    selectedAlbum.value = undefined;
    listenedInOrder.value = true;
    listenMethod.value = 'spotify';
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
    saving,
    logAlbumListen,
  };
};
