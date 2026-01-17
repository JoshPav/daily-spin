import { ref } from 'vue';

type UseDeleteBacklogItemProps = {
  onSuccess?: () => void;
};

export const useDeleteBacklogItem = ({
  onSuccess = () => {},
}: UseDeleteBacklogItemProps = {}) => {
  const deleting = ref(false);
  const error = ref<string | null>(null);

  const deleteItem = async (id: string) => {
    deleting.value = true;
    error.value = null;

    try {
      await $fetch(`/api/backlog/${id}`, {
        method: 'DELETE',
      });

      onSuccess();
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to remove album';
      throw err;
    } finally {
      deleting.value = false;
    }
  };

  return {
    deleting,
    error,
    deleteItem,
  };
};
