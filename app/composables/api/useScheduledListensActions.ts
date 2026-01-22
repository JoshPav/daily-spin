import type {
  AddScheduledListenBody,
  ScheduledListenItem,
} from '#shared/schema';

export const useScheduledListensActions = () => {
  const removing = ref(false);
  const adding = ref(false);

  const removeScheduledListen = async (id: string): Promise<void> => {
    removing.value = true;
    try {
      await $fetch(`/api/listens/scheduled/${id}`, {
        method: 'DELETE',
      });
      // Refresh the scheduled listens data
      await refreshNuxtData('scheduled-listens');
    } finally {
      removing.value = false;
    }
  };

  const addScheduledListen = async (
    body: AddScheduledListenBody,
  ): Promise<ScheduledListenItem> => {
    adding.value = true;
    try {
      const result = await $fetch<ScheduledListenItem>(
        '/api/listens/scheduled',
        {
          method: 'POST',
          body,
        },
      );
      // Refresh the scheduled listens data
      await refreshNuxtData('scheduled-listens');
      return result;
    } finally {
      adding.value = false;
    }
  };

  return {
    removeScheduledListen,
    addScheduledListen,
    removing,
    adding,
  };
};
