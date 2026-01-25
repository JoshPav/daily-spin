<script setup lang="ts">
import type { FavoriteSong } from '#shared/schema';
import { useScrollToToday } from '~/composables/components/useScrollToToday';
import type {
  PastDayData,
  ScheduledDayData,
} from '~/composables/pages/dashboard/useDashboardData';
import { toDateKey } from '~/utils/dateUtils';

const {
  displayDates,
  getDataForDate,
  updateDay,
  loading,
  scheduledListensLoading,
  error,
  listensHistory,
} = useDashboardData();

// Update favorite song for a date
const updateFavoriteSongForDate = (
  date: string,
  favoriteSong: FavoriteSong | null,
) => {
  const data = getDataForDate(toDateKey(date));

  if (data.type === 'past' && data.listens) {
    updateDay(date, { ...data.listens, favoriteSong });
  }
};

// ScrollArea ref
const scrollAreaRef = useTemplateRef<HTMLDivElement>('scrollArea');

const today = toDateKey(new Date());

const isReady = computed(() => displayDates.value.length > 0);
const { todayElement, getScrollableElement, scrollToToday, isTodayVisible } =
  useScrollToToday({
    isReady,
    scrollAreaRef,
  });

// Track today's element for scroll-to-today functionality
const setTodayRef = (dateKey: string) => (el: unknown) => {
  if (dateKey === today) {
    todayElement.value =
      (el as { $el?: HTMLElement })?.$el ?? (el as HTMLElement) ?? null;
  }
};

// Infinite scroll - load more when scrolling near the top
const SCROLL_THRESHOLD = 200; // pixels from top to trigger load

const handleScroll = async () => {
  const container = getScrollableElement();
  if (!container || loading.value || !listensHistory.hasMore.value) {
    return;
  }

  // Check if scrolled near the top (loading older content)
  if (container.scrollTop <= SCROLL_THRESHOLD) {
    // Browser's native scroll anchoring (overflow-anchor) handles
    // keeping the viewport stable when content is prepended
    await listensHistory.fetchMore();
  }
};

// Set up scroll listener when ScrollArea is ready
onMounted(() => {
  watchEffect((onCleanup) => {
    const container = getScrollableElement();
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      onCleanup(() => {
        container.removeEventListener('scroll', handleScroll);
      });
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
  <div class="relative">
    <div
      ref="scrollArea"
      class="h-[calc(100vh-var(--ui-header-height))] overflow-y-auto [scrollbar-gutter:stable]"
    >
      <div class="flex flex-col max-w-450 mx-auto px-4 md:px-6">
        <!-- Loading more indicator (top) - excluded from scroll anchoring -->
        <div
          v-if="loading"
          class="flex flex-col items-center gap-2 py-4 [overflow-anchor:none]"
        >
          <span class="text-sm text-muted">Loading older albums...</span>
          <UProgress animation="carousel" class="w-32" />
        </div>

        <!-- Error state -->
        <div
          v-if="error"
          class="text-center py-12 px-6 text-base font-medium text-secondary-500"
        >
          Error: {{ error.message }}
        </div>

        <div
          v-else
          class="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] auto-rows-min gap-4 md:gap-6 w-full pt-10 pr-2 pb-4 md:pb-8"
        >
          <!-- Sticky month header -->
          <StickyMonthHeader />

          <div
            v-if="!listensHistory.hasMore.value"
            class="col-span-full text-center text-sm text-muted [overflow-anchor:none]"
          >
            You've reached the beginning of your listening history
          </div>

          <ClientOnly>
            <template v-for="dateKey in displayDates" :key="dateKey">
              <PastAlbumDay
                v-if="getDataForDate(dateKey).type === 'past'"
                :ref="setTodayRef(dateKey)"
                :date="dateKey"
                :listens="(getDataForDate(dateKey) as PastDayData).listens"
                :on-favorite-song-update="updateFavoriteSongForDate"
              />
              <ScheduledAlbumDay
                v-else
                :ref="setTodayRef(dateKey)"
                :date="dateKey"
                :scheduled-listen="(getDataForDate(dateKey) as ScheduledDayData).scheduledListen"
                :pending="scheduledListensLoading"
              />
            </template>
          </ClientOnly>
        </div>
      </div>
    </div>

    <JumpToTodayButton :visible="!isTodayVisible" @click="scrollToToday" />
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
