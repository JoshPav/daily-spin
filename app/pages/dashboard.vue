<script setup lang="ts">
import { useScrollToToday } from '~/composables/components/useScrollToToday';
import type { DailyListens, FutureListenItem } from '~~/shared/schema';

const { data, pending, error, loadingMore, hasMore, fetchMore } = useListens();
const { data: futureListensData } = useFutureListens();

// ScrollArea ref
const scrollAreaRef = useTemplateRef<ComponentPublicInstance>('scrollArea');

// Helper to check if a date string is today or in the future
const isTodayOrFuture = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date >= today;
};

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

type DayEntry = {
  date: string;
  dailyListens?: DailyListens;
  futureAlbum?: FutureListenItem;
};

const days = computed<DayEntry[]>(() => {
  if (!data.value || data.value.length === 0) {
    return [];
  }

  const mostRecentListen = data.value.at(-1);

  if (!mostRecentListen) {
    return data.value.map((day) => ({ date: day.date, dailyListens: day }));
  }

  const datesInFuture = getNextNDays(new Date(mostRecentListen.date), 7);

  const pastDays: DayEntry[] = data.value.map((day) => {
    const dateKey = day.date.split('T')[0];
    return {
      date: day.date,
      dailyListens: day,
      // Also check for future album on today
      futureAlbum: futureListensByDate.value.get(dateKey),
    };
  });

  const futureDays: DayEntry[] = datesInFuture.slice(1).map((date) => {
    const dateStr = date.toISOString();
    const dateKey = dateStr.split('T')[0];
    return {
      date: dateStr,
      futureAlbum: futureListensByDate.value.get(dateKey),
    };
  });

  return [...pastDays, ...futureDays];
});

const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

const isReady = computed(() => days.value && days.value.length > 0);
const { todayElement: todayItem, getScrollableElement } = useScrollToToday({
  isReady,
  scrollAreaRef,
});

// Infinite scroll - load more when scrolling near the top
const SCROLL_THRESHOLD = 200; // pixels from top to trigger load

const handleScroll = async () => {
  const container = getScrollableElement();
  if (!container || loadingMore.value || !hasMore.value) {
    return;
  }

  // Check if scrolled near the top (loading older content)
  if (container.scrollTop <= SCROLL_THRESHOLD) {
    // Save scroll position info before loading
    const previousScrollHeight = container.scrollHeight;

    await fetchMore();

    // Restore scroll position after content is prepended
    await nextTick();
    const newScrollHeight = container.scrollHeight;
    const addedHeight = newScrollHeight - previousScrollHeight;
    container.scrollTop = container.scrollTop + addedHeight;
  }
};

// Set up scroll listener when ScrollArea is ready
onMounted(() => {
  // Watch for the scroll area to be available
  watchEffect(() => {
    const container = getScrollableElement();
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
  });
});

onUnmounted(() => {
  const container = getScrollableElement();
  if (container) {
    container.removeEventListener('scroll', handleScroll);
  }
});
</script>

<template>
  <UScrollArea ref="scrollArea" class="h-full">
    <div class="flex flex-col max-w-450 mx-auto px-4 md:px-6">
      <!-- Loading more indicator (top) -->
      <div v-if="loadingMore" class="text-center py-4 text-sm text-[#b3b3b3]">
        Loading older albums...
      </div>

      <!-- Initial loading state -->
      <div
        v-if="pending && data.length === 0"
        class="text-center py-12 px-6 text-base font-medium text-[#b3b3b3]"
      >
        Loading...
      </div>

      <!-- Error state -->
      <div
        v-else-if="error"
        class="text-center py-12 px-6 text-base font-medium text-[#f15e6c]"
      >
        Error: {{ error.message }}
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!pending && days.length === 0"
        class="text-center py-12 px-6 text-base font-medium text-[#b3b3b3]"
      >
        No listens yet for this month
      </div>

      <!-- Scrollable grid -->
      <div
        v-else
        class="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] auto-rows-min gap-4 md:gap-6 w-full pt-10 pr-2 pb-4 md:pb-8"
      >
        <StickyMonthHeader />
        <template v-for="day in days" :key="day.date">
          <FutureAlbumDay
            v-if="isTodayOrFuture(day.date)"
            :date="day.date"
            :future-album="day.futureAlbum"
            :ref="el => {
              if (day.date.split('T')[0] === today) {
                todayItem = (el as any)?.$el ?? el ?? null;
              }
            }"
          />
          <PastAlbumDay
            v-else-if="day.dailyListens"
            :day-listens="day.dailyListens"
            :ref="el => {
              if (day.date.split('T')[0] === today) {
                todayItem = (el as any)?.$el ?? el ?? null;
              }
            }"
          />
        </template>
      </div>
    </div>
  </UScrollArea>
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
