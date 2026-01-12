import { computed, ref } from 'vue';

const dateOfListen = ref<Date | undefined>();

type OpenModalPayload = {
  date: Date;
};

export const useAddAlbumListenModal = () => {
  const isOpen = computed(() => !!dateOfListen.value);

  const open = ({ date }: OpenModalPayload) => {
    console.log('open');
    dateOfListen.value = date;
  };

  const close = () => {
    dateOfListen.value = undefined;
  };

  return {
    isOpen,
    dateOfListen,
    open,
    close,
  };
};
