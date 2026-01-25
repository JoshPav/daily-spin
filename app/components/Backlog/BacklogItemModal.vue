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
          <template v-else>
            <div class="flex flex-col gap-3">
              <UButton
                block
                color="primary"
                variant="subtle"
                size="lg"
                @click="toggleSchedulePicker"
              >
                <div class="flex-1 flex items-center justify-center gap-1.5">
                  <UIcon :name="Icons.CALENDAR.DAYS" class="size-4.5" />
                  {{ showSchedulePicker ? 'Cancel' : 'Schedule' }}
                </div>
                <UIcon
                  :name="showSchedulePicker ? Icons.CHEVRON.UP : Icons.CHEVRON.DOWN"
                  class="size-4 text-muted"
                />
              </UButton>

              <!-- Inline date picker -->
              <div
                v-if="showSchedulePicker"
                class="flex flex-col gap-3 p-4 bg-elevated rounded-lg"
              >
                <p class="text-sm font-medium text-default">
                  Choose a day to schedule
                </p>

                <!-- Loading state -->
                <div
                  v-if="loadingDays"
                  class="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4"
                >
                  <USkeleton
                    v-for="i in 7"
                    :key="i"
                    class="w-20 h-20 shrink-0 rounded-lg"
                  />
                </div>

                <!-- Day cards - horizontal scroll -->
                <div
                  v-else
                  class="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory"
                >
                  <div
                    v-for="day in days"
                    :key="day.date"
                    class="shrink-0 w-20 relative snap-start"
                  >
                    <AlbumDayCard
                      :date="day.date"
                      :albums="day.albums"
                      selectable
                      compact
                      @click="handleDayClick(day)"
                    >
                      <template #badge>
                        <!-- Swap icon for days with existing album -->
                        <div
                          v-if="day.scheduledListen"
                          class="absolute top-1 right-1 flex items-center justify-center w-5 h-5 rounded bg-amber-500/90 text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)] z-10 pointer-events-none"
                        >
                          <UIcon :name="Icons.CALENDAR.SWAP" class="w-3 h-3" />
                        </div>
                        <!-- Plus icon for empty days -->
                        <div
                          v-else
                          class="absolute top-1 right-1 flex items-center justify-center w-5 h-5 rounded bg-green-500/90 text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)] z-10 pointer-events-none"
                        >
                          <UIcon :name="Icons.PLUS" class="w-3 h-3" />
                        </div>
                      </template>
                    </AlbumDayCard>
                  </div>
                  <!-- Scroll hint -->
                  <div
                    class="shrink-0 w-8 flex items-center justify-center text-muted"
                  >
                    <UIcon
                      :name="Icons.CHEVRON.DOWN"
                      class="w-5 h-5 rotate-[-90deg]"
                    />
                  </div>
                </div>

                <!-- Info text -->
                <p class="text-xs text-muted flex items-center gap-1">
                  <UIcon
                    :name="Icons.CALENDAR.SWAP"
                    class="w-3.5 h-3.5 text-amber-500 shrink-0"
                  />
                  <span>days will have their album replaced</span>
                </p>
              </div>
            </div>
          </template>

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
import { addDays, startOfDay } from 'date-fns';
import type {
  AddScheduledListenBody,
  BacklogAlbum,
  ScheduledListenItem,
} from '#shared/schema';
import type { AlbumCardInfo } from '~/components/AlbumDayCard/AlbumDayCard.vue';
import type { AlbumDetailsAlbum } from '~/components/AlbumDetails/AlbumDetails.vue';
import { Icons } from '~/components/common/icons';
import { formatDate, toDateKey } from '~/utils/dateUtils';

interface DayInfo {
  date: string;
  scheduledListen: ScheduledListenItem | null;
  albums: AlbumCardInfo[];
}

const props = defineProps<{
  album: BacklogAlbum;
  scheduledListen?: ScheduledListenItem | null;
  onDeleted?: () => void;
  onScheduleChanged?: () => void;
}>();

const emit = defineEmits<{
  close: [];
}>();

// Schedule picker state
const showSchedulePicker = ref(false);
const loadingDays = ref(false);
const scheduledByDate = ref<Map<string, ScheduledListenItem>>(new Map());
const removingSchedule = ref(false);

const { addScheduledListen, removeScheduledListen, adding } =
  useScheduledListensActions();

const { deleting, deleteItem } = useDeleteBacklogItem({
  onSuccess: () => {
    props.onDeleted?.();
    emit('close');
  },
});

const modalDescription = computed(() => {
  const addedDate = new Date(props.album.addedAt);
  const addedText = `Added on ${addedDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;

  return addedText;
});

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

// Generate next 7 days (starting from tomorrow)
const days = computed<DayInfo[]>(() => {
  const result: DayInfo[] = [];
  const today = startOfDay(new Date());

  for (let i = 1; i <= 7; i++) {
    const date = addDays(today, i);
    const dateKey = toDateKey(date);
    const scheduledListen = scheduledByDate.value.get(dateKey) ?? null;

    const albums: AlbumCardInfo[] = scheduledListen
      ? [
          {
            imageUrl: scheduledListen.album.imageUrl,
            artistName: scheduledListen.album.artists[0]?.name ?? 'Unknown',
            albumName: scheduledListen.album.name,
          },
        ]
      : [];

    result.push({ date: dateKey, scheduledListen, albums });
  }

  return result;
});

// Fetch scheduled listens for the next 7 days
const fetchScheduledListens = async () => {
  loadingDays.value = true;
  try {
    const today = startOfDay(new Date());
    const endDate = addDays(today, 6);

    const response = await $fetch<{
      items: Record<string, ScheduledListenItem | null>;
    }>('/api/listens/scheduled', {
      query: {
        startDate: toDateKey(today),
        endDate: toDateKey(endDate),
      },
    });

    const newMap = new Map<string, ScheduledListenItem>();
    for (const [dateKey, item] of Object.entries(response.items)) {
      if (item !== null) {
        newMap.set(dateKey, item);
      }
    }
    scheduledByDate.value = newMap;
  } finally {
    loadingDays.value = false;
  }
};

const toggleSchedulePicker = () => {
  showSchedulePicker.value = !showSchedulePicker.value;
  if (showSchedulePicker.value && scheduledByDate.value.size === 0) {
    fetchScheduledListens();
  }
};

const handleDayClick = async (day: DayInfo) => {
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
