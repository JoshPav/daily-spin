import type { AddFutureListenBody, FutureListenItem } from '#shared/schema';

export const useFutureListensActions = () => {
  const removing = ref(false);
  const adding = ref(false);

  const removeFutureListen = async (id: string): Promise<void> => {
    removing.value = true;
    try {
      await $fetch(`/api/future-listens/${id}`, {
        method: 'DELETE',
      });
      // Refresh the future listens data
      await refreshNuxtData('future-listens');
    } finally {
      removing.value = false;
    }
  };

  const addFutureListen = async (
    body: AddFutureListenBody,
  ): Promise<FutureListenItem> => {
    adding.value = true;
    try {
      const result = await $fetch<FutureListenItem>('/api/future-listens', {
        method: 'POST',
        body,
      });
      // Refresh the future listens data
      await refreshNuxtData('future-listens');
      return result;
    } finally {
      adding.value = false;
    }
  };

  return {
    removeFutureListen,
    addFutureListen,
    removing,
    adding,
  };
};
