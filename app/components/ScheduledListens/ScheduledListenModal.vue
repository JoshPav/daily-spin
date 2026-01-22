<template>
  <UModal
    :title="modalHeader"
    :description="modalSubheading"
    :content="{ onOpenAutoFocus: (e) => e.preventDefault() }"
  >
    <template #body>
      <div class="flex flex-col gap-6">
        <AlbumDetails :album="album" />

        <USeparator />

        <!-- Actions -->
        <UButton
          block
          color="neutral"
          variant="subtle"
          size="lg"
          :loading="removing"
          @click="handleRemove"
        >
          <UIcon :name="Icons.CALENDAR.REMOVE" class="size-4.5" />
          Remove from schedule
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { AlbumDetailsAlbum } from '~/components/AlbumDetails/AlbumDetails.vue';
import { Icons } from '~/components/common/icons';
import { formatDate } from '~/utils/dateUtils';
import type { ScheduledListenItem } from '~~/shared/schema';

const { scheduledListenItem } = defineProps<{
  scheduledListenItem: ScheduledListenItem;
}>();
const emit = defineEmits<{ close: [] }>();

const { removeScheduledListen, removing } = useScheduledListensActions();

const modalHeader = computed(() => 'Scheduled Album');

const modalSubheading = computed(() =>
  formatDate(new Date(scheduledListenItem.date)),
);

// Map ScheduledListenItem to AlbumDetailsAlbum
const album = computed<AlbumDetailsAlbum>(() => ({
  spotifyId: scheduledListenItem.album.spotifyId,
  name: scheduledListenItem.album.name,
  imageUrl: scheduledListenItem.album.imageUrl,
  artists: scheduledListenItem.album.artists,
  releaseDate: scheduledListenItem.album.releaseDate,
}));

const handleRemove = async () => {
  await removeScheduledListen(scheduledListenItem.id);
  emit('close');
};
</script>
