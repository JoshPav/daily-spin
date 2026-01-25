<template>
  <div class="flex flex-col gap-3">
    <UButton
      block
      color="primary"
      variant="subtle"
      size="lg"
      @click="togglePicker"
    >
      <div class="flex-1 flex items-center justify-center gap-1.5">
        <UIcon :name="Icons.CALENDAR.DAYS" class="size-4.5" />
        {{ isOpen ? 'Cancel' : 'Schedule' }}
      </div>
      <UIcon
        :name="isOpen ? Icons.CHEVRON.UP : Icons.CHEVRON.DOWN"
        class="size-4 text-muted"
      />
    </UButton>

    <!-- Inline date picker -->
    <div v-if="isOpen" class="flex flex-col gap-3 p-4 bg-elevated rounded-lg">
      <p class="text-sm font-medium text-default">Choose a day to schedule</p>

      <!-- Loading state -->
      <div v-if="loading" class="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
        <USkeleton
          v-for="i in DAYS_TO_SHOW"
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
        <div class="shrink-0 w-8 flex items-center justify-center text-muted">
          <UIcon :name="Icons.CHEVRON.DOWN" class="w-5 h-5 -rotate-90" />
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

<script setup lang="ts">
import { addDays, startOfDay } from 'date-fns';
import type { ScheduledListenItem } from '#shared/schema';
import type { AlbumCardInfo } from '~/components/AlbumDayCard/AlbumDayCard.vue';
import { Icons } from '~/components/common/icons';
import { toDateKey } from '~/utils/dateUtils';

export interface ScheduleDay {
  date: string;
  scheduledListen: ScheduledListenItem | null;
  albums: AlbumCardInfo[];
}

const emit = defineEmits<{
  select: [day: ScheduleDay];
}>();

const isOpen = ref(false);

// Number of days to show in the picker (starting from tomorrow)
const DAYS_TO_SHOW = 7;

const { scheduledListensByDate, loading } = useScheduledListens({
  initial: DAYS_TO_SHOW,
  fetchMore: DAYS_TO_SHOW,
});

const days = computed<ScheduleDay[]>(() => {
  const result: ScheduleDay[] = [];
  const today = startOfDay(new Date());

  for (let i = 1; i <= DAYS_TO_SHOW; i++) {
    const date = addDays(today, i);
    const dateKey = toDateKey(date);
    const scheduledListen = scheduledListensByDate.value.get(dateKey) ?? null;

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

const togglePicker = () => {
  isOpen.value = !isOpen.value;
};

const handleDayClick = (day: ScheduleDay) => {
  emit('select', day);
};
</script>
