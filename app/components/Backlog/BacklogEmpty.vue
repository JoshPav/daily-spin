<template>
  <div class="empty-state flex-col text-center py-16">
    <UIcon :name="Icons.BACKLOG_EMPTY" class="text-6xl text-gray-600 mb-4" />
    <p class="text-highlighted font-bold text-xl">Your backlog is empty</p>
    <p class="text-muted font-medium mt-2 text-sm">
      Add albums you want to listen to later
    </p>
    <UButton
      color="primary"
      :icon="Icons.PLUS"
      class="mt-4"
      @click="openAddModal"
    >
      Add Your First Album
    </UButton>
  </div>
</template>

<script lang="ts" setup>
import { LazyAddToBacklogModal } from '#components';
import { Icons } from '../common/icons';

const props = defineProps<{
  onAdded?: () => void;
}>();

const overlay = useOverlay();
const modal = overlay.create(LazyAddToBacklogModal);

const openAddModal = () => {
  modal.open({
    onAdded: props.onAdded,
  });
};
</script>

<style>
</style>
