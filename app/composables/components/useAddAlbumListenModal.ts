const isOpen = ref(false);

export const useAddAlbumListenModal = () => {
  const open = () => {
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
  };

  return {
    isOpen,
    open,
    close,
  };
};
