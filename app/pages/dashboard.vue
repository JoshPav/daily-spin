<script setup lang="ts">
import { useScrollToToday } from '~/composables/components/useScrollToToday';
import type {
  DailyListensWithFuture,
  FutureListenItem,
} from '~~/shared/schema';

const { data, pending, error } = useListens();
const { data: futureListensData } = useFutureListens();

function getNextNDays(startDate: Date, n: number): Date[] {
  const days: Date[] = [];

  for (let i = 0; i < n; i++) {
    const nextDay = new Date(startDate);
    nextDay.setDate(startDate.getDate() + i);
    days.push(nextDay);
  }

  return days;
}

// Create a map of future listens by date for efficient lookup
const futureListensByDate = computed<Map<string, FutureListenItem>>(() => {
  const map = new Map<string, FutureListenItem>();
  if (!futureListensData.value?.items) {
    return map;
  }
  for (const item of futureListensData.value.items) {
    // Normalize date to YYYY-MM-DD format
    const dateKey = item.date.split('T')[0];
    map.set(dateKey, item);
  }
  return map;
});

const listens = computed<DailyListensWithFuture[]>(() => {
  if (!data.value) {
    return [];
  }

  const mostRecentListen = data.value.at(-1);

  if (!mostRecentListen) {
    return data.value;
  }

  const datesInFuture = getNextNDays(new Date(mostRecentListen.date), 7);

  const allDays = [
    ...data.value,
    ...datesInFuture
      .slice(1)
      .map((date) => ({ date: date.toISOString(), albums: [] })),
  ];

  // Merge future listens into each day
  return allDays.map((day) => {
    const dateKey = day.date.split('T')[0];
    const futureAlbum = futureListensByDate.value.get(dateKey);
    return {
      ...day,
      futureAlbum,
    };
  });
});

const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

const isReady = computed(() => listens.value && listens.value.length > 0);
const { scrollContainer, todayElement: todayItem } = useScrollToToday({
  isReady,
});
</script>

<template>
    <div ref="scrollContainer" class="flex flex-col max-w-450 mx-auto px-4 md:px-6 overflow-y-auto h-full">
      <!-- Loading / Error / Empty states -->
      <div v-if="pending" class="text-center py-12 px-6 text-base font-medium text-[#b3b3b3]">Loading...</div>
      <div v-else-if="error" class="text-center py-12 px-6 text-base font-medium text-[#f15e6c]">Error: {{ error }}</div>
      <div v-else-if="listens && listens.length === 0" class="text-center py-12 px-6 text-base font-medium text-[#b3b3b3]">
        No listens yet for this month
      </div>

      <!-- Scrollable grid -->
      <div v-else class="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] auto-rows-min gap-4 md:gap-6 w-full pt-10 pr-2 pb-4 md:pb-8">
          <StickyMonthHeader />
          <DailyListens
            v-for="day in listens"
            :key="day.date"
            :day-listens="day"
            :ref="el => {
              if (day.date.split('T')[0] === today) {
                todayItem = (el as any)?.$el ?? el ?? null;
              }
            }"
          />
        </div>
    </div>
  </template>

<style scoped>
@view-transition {
  navigation: auto;
}

::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
}

::view-transition-old(*),
::view-transition-new(*) {
  animation-duration: 0.4s;
}
</style>
