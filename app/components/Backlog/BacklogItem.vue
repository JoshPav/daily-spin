<template>
  <div
    class="flex gap-4 p-3 bg-elevated rounded-lg items-center transition-colors duration-200 hover:bg-muted cursor-pointer"
    @click="openModal"
  >
    <img
      v-if="album.imageUrl"
      :src="album.imageUrl"
      :alt="album.name"
      class="w-16 h-16 rounded object-cover shrink-0"
    >
    <div
      v-else
      class="w-16 h-16 rounded shrink-0 bg-neutral-600 flex items-center justify-center"
    >
      <UIcon :name="Icons.MUSIC.NOTE" class="text-3xl text-neutral-500" />
    </div>
    <div class="flex-1 flex flex-col gap-1 min-w-0">
      <div
        class="text-base font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis"
      >
        <HighlightedText :text="album.name" :search-term="searchTerm" />
      </div>
      <div
        v-if="!hideArtist"
        class="text-sm font-medium text-muted whitespace-nowrap overflow-hidden text-ellipsis"
      >
        <HighlightedText :text="artistNames" :search-term="searchTerm" />
      </div>
      <div class="text-xs text-dimmed">Added {{ addedDate }}</div>
    </div>
    <!-- Scheduled badge -->
    <UTooltip v-if="scheduledListen" :text="scheduledTooltip">
      <div
        class="flex items-center justify-center w-8 h-8 rounded-md bg-indigo-500/20 text-indigo-400"
      >
        <UIcon :name="Icons.CALENDAR.DAYS" class="w-4 h-4" />
      </div>
    </UTooltip>
    <UButton
      color="neutral"
      variant="ghost"
      size="lg"
      class="hover:cursor-pointer"
      :icon="Icons.TRASH"
      :loading="deleting"
      @click.stop="handleDelete"
    />
  </div>
</template>

<script lang="ts" setup>
import { LazyBacklogItemModal } from '#components';
import type { BacklogAlbum, ScheduledListenItem } from '#shared/schema';
import { Icons } from '~/components/common/icons';
import { formatDate } from '~/utils/dateUtils';

const props = defineProps<{
  album: BacklogAlbum;
  scheduledListen?: ScheduledListenItem | null;
  hideArtist?: boolean;
  searchTerm?: string;
}>();

const emit = defineEmits<{
  deleted: [];
  scheduleChanged: [];
}>();

const overlay = useOverlay();
const backlogItemModal = overlay.create(LazyBacklogItemModal);

const scheduledTooltip = computed(() => {
  if (!props.scheduledListen) return '';
  return `Scheduled for ${formatDate(new Date(props.scheduledListen.date))}`;
});

const openModal = () => {
  backlogItemModal.open({
    album: props.album,
    scheduledListen: props.scheduledListen,
    onDeleted: () => emit('deleted'),
    onScheduleChanged: () => emit('scheduleChanged'),
  });
};

const artistNames = computed(() =>
  props.album.artists.map((a) => a.name).join(', '),
);

const addedDate = computed(() => {
  const date = new Date(props.album.addedAt);
  const now = new Date();
  const diffInDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffInDays === 0) {
    return 'today';
  }
  if (diffInDays === 1) {
    return 'yesterday';
  }
  if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  const years = Math.floor(diffInDays / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
});

const { deleting, deleteItem } = useDeleteBacklogItem({
  onSuccess: () => emit('deleted'),
});

const handleDelete = async () => {
  await deleteItem(props.album.id);
};
</script>
