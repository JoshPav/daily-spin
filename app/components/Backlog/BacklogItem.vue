<template>
  <div class="backlog-item">
    <img
      v-if="album.imageUrl"
      :src="album.imageUrl"
      :alt="album.name"
      class="album-image"
    />
    <div v-else class="album-image placeholder">
      <UIcon name="i-heroicons-musical-note" class="text-3xl text-gray-500" />
    </div>
    <div class="album-info">
      <div class="album-name">{{ album.name }}</div>
      <div class="artist-names">{{ artistNames }}</div>
    </div>
    <UButton
      color="neutral"
      variant="ghost"
      size="sm"
      icon="i-heroicons-trash"
      :loading="deleting"
      @click="handleDelete"
    />
  </div>
</template>

<script lang="ts" setup>
import type { BacklogAlbum } from '#shared/schema';

const props = defineProps<{
  album: BacklogAlbum;
}>();

const emit = defineEmits<{
  deleted: [];
}>();

const artistNames = computed(() =>
  props.album.artists.map((a) => a.name).join(', '),
);

const { deleting, deleteItem } = useDeleteBacklogItem({
  onSuccess: () => emit('deleted'),
});

const handleDelete = async () => {
  await deleteItem(props.album.id);
};
</script>

<style scoped>
.backlog-item {
  display: flex;
  gap: 16px;
  padding: 12px;
  background-color: #282828;
  border-radius: 8px;
  align-items: center;
  transition: background-color 0.2s ease;
}

.backlog-item:hover {
  background-color: #333333;
}

.album-image {
  width: 64px;
  height: 64px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.album-image.placeholder {
  background-color: #404040;
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.album-name {
  font-family: 'Montserrat', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-names {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #b3b3b3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
