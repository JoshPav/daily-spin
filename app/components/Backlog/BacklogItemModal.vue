<template>
  <UModal
    :title="album.name"
    :description="modalDescription"
    :content="{ onOpenAutoFocus: (e) => e.preventDefault() }"
  >
    <template #body>
      <div class="flex flex-col gap-6">
        <AlbumDetails :album="albumDetails" />

        <USeparator />

        <!-- Actions -->
        <div class="flex flex-col gap-3">
          <!-- Already scheduled: show status and remove button -->
          <template v-if="scheduledListen">
            <div
              class="flex items-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg"
            >
              <UIcon
                :name="Icons.CALENDAR.DAYS"
                class="w-5 h-5 text-indigo-400 shrink-0"
              />
              <span class="text-sm text-default">
                Scheduled for
                <strong>{{ scheduledDateFormatted }}</strong>
              </span>
            </div>

            <UButton
              block
              color="warning"
              variant="subtle"
              size="lg"
              :loading="removingSchedule"
              @click="handleRemoveFromSchedule"
            >
              <UIcon :name="Icons.CALENDAR.REMOVE" class="size-4.5" />
              Remove from schedule
            </UButton>
          </template>

          <!-- Not scheduled: show schedule picker -->
          <SchedulePicker v-else @select="handleDaySelect" />

          <UButton
            block
            color="error"
            variant="subtle"
            size="lg"
            :loading="deleting"
            @click="handleRemove"
          >
            <UIcon :name="Icons.TRASH" class="size-4.5" />
            Remove from backlog
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { format } from 'date-fns';
import type {
  AddScheduledListenBody,
  BacklogAlbum,
  ScheduledListenItem,
} from '#shared/schema';
import type { AlbumDetailsAlbum } from '~/components/AlbumDetails/AlbumDetails.vue';
import type { ScheduleDay } from '~/components/Backlog/SchedulePicker.vue';
import { Icons } from '~/components/common/icons';
import { formatDate } from '~/utils/dateUtils';

const props = defineProps<{
  album: BacklogAlbum;
  scheduledListen?: ScheduledListenItem | null;
  onDeleted?: () => void;
  onScheduleChanged?: () => void;
}>();

const emit = defineEmits<{
  close: [];
}>();

const removingSchedule = ref(false);

const { addScheduledListen, removeScheduledListen, adding } =
  useScheduledListensActions();

const { deleting, deleteItem } = useDeleteBacklogItem({
  onSuccess: () => {
    props.onDeleted?.();
    emit('close');
  },
});

const modalDescription = computed(
  () => `Added on ${format(new Date(props.album.addedAt), 'd MMMM yyyy')}`,
);

const scheduledDateFormatted = computed(() => {
  if (!props.scheduledListen) return '';
  return formatDate(new Date(props.scheduledListen.date));
});

// Map BacklogAlbum to AlbumDetailsAlbum
const albumDetails = computed<AlbumDetailsAlbum>(() => ({
  spotifyId: props.album.spotifyId,
  name: props.album.name,
  imageUrl: props.album.imageUrl,
  artists: props.album.artists,
  releaseDate: props.album.releaseDate,
}));

const handleDaySelect = async (day: ScheduleDay) => {
  if (adding.value) return;

  // If there's an existing scheduled listen, remove it first
  if (day.scheduledListen) {
    await removeScheduledListen(day.scheduledListen.id);
  }

  // Schedule the new album
  const body: AddScheduledListenBody = {
    spotifyId: props.album.spotifyId,
    name: props.album.name,
    imageUrl: props.album.imageUrl ?? undefined,
    releaseDate: props.album.releaseDate ?? undefined,
    artists: props.album.artists,
    date: day.date,
  };

  await addScheduledListen(body);
  props.onScheduleChanged?.();
  emit('close');
};

const handleRemoveFromSchedule = async () => {
  if (!props.scheduledListen || removingSchedule.value) return;

  removingSchedule.value = true;
  try {
    await removeScheduledListen(props.scheduledListen.id);
    props.onScheduleChanged?.();
    emit('close');
  } finally {
    removingSchedule.value = false;
  }
};

const handleRemove = async () => {
  await deleteItem(props.album.id);
};
</script>
