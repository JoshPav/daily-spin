<template>
  <UModal
    :title="album.name"
    :description="addedDescription"
    :content="{ onOpenAutoFocus: (e) => e.preventDefault() }"
  >
    <template #body>
      <div class="flex flex-col gap-6">
        <AlbumDetails :album="albumDetails" />

        <USeparator />

        <!-- Actions -->
        <UButton
          block
          color="neutral"
          variant="subtle"
          size="lg"
          :loading="deleting"
          @click="handleRemove"
        >
          <UIcon :name="Icons.TRASH" class="size-4.5" />
          Remove from backlog
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { AlbumDetailsAlbum } from '~/components/AlbumDetails/AlbumDetails.vue';
import { Icons } from '~/components/common/icons';
import type { BacklogAlbum } from '~~/shared/schema';

const props = defineProps<{
  album: BacklogAlbum;
  onDeleted?: () => void;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { deleting, deleteItem } = useDeleteBacklogItem({
  onSuccess: () => {
    props.onDeleted?.();
    emit('close');
  },
});

const addedDescription = computed(() => {
  const date = new Date(props.album.addedAt);
  return `Added on ${date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;
});

// Map BacklogAlbum to AlbumDetailsAlbum
const albumDetails = computed<AlbumDetailsAlbum>(() => ({
  spotifyId: props.album.spotifyId,
  name: props.album.name,
  imageUrl: props.album.imageUrl,
  artists: props.album.artists,
  releaseDate: props.album.releaseDate,
}));

const handleRemove = async () => {
  await deleteItem(props.album.id);
};
</script>
