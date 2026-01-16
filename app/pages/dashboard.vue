<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import type { DailyListens } from '~~/shared/schema';

const { data, pending, error } = useListens();

function getNextNDays(startDate: Date, n: number): Date[] {
  const days: Date[] = [];

  for (let i = 0; i < n; i++) {
    const nextDay = new Date(startDate);
    nextDay.setDate(startDate.getDate() + i);
    days.push(nextDay);
  }

  return days;
}

const listens = computed<DailyListens[]>(() => {
  if (!data.value) {
    return [];
  }

  const mostRecentListen = data.value.at(-1);

  if (!mostRecentListen) {
    return data.value;
  }

  const datesInFuture = getNextNDays(new Date(mostRecentListen.date), 7);

  return [
    ...data.value,
    ...datesInFuture
      .slice(1)
      .map((date) => ({ date: date.toISOString(), albums: [] })),
  ];
});

// Refs for scrolling
const scrollContainer = ref<HTMLElement | null>(null);
const todayItem = ref<HTMLElement | null>(null);
const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

// Smooth scroll function
const scrollToToday = () => {
  const container = scrollContainer.value;
  const item = todayItem.value;

  if (container && item) {
    const top = item.offsetTop - container.offsetTop;
    container.scrollTo({
      top: top - container.offsetHeight / 2 + item.offsetHeight / 2,
      behavior: 'smooth',
    });
  }
};

// Also scroll on page refresh
onMounted(async () => {
  if (listens.value && listens.value.length > 0) {
    await nextTick();
    scrollToToday();
  }
});
</script>

<template>
    <div class="fixed inset-0 flex flex-col max-w-450 mx-auto px-4 md:px-6 overflow-y-auto pt-(--ui-header-height)">
      <!-- Loading / Error / Empty states -->
      <div v-if="pending" class="text-center py-12 px-6 text-base font-medium text-[#b3b3b3]">Loading...</div>
      <div v-else-if="error" class="text-center py-12 px-6 text-base font-medium text-[#f15e6c]">Error: {{ error }}</div>
      <div v-else-if="listens && listens.length === 0" class="text-center py-12 px-6 text-base font-medium text-[#b3b3b3]">
        No listens yet for this month
      </div>

      <!-- Scrollable grid -->
      <div v-else class="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] auto-rows-min gap-4 md:gap-6 w-full pt-10 pr-2 pb-4 md:pb-8" ref="scrollContainer">
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
