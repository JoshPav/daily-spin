<template>
  <div
    ref="cardRef"
    class="share-card relative flex flex-col bg-[#121212] text-white overflow-hidden"
    :style="cardStyle"
  >
    <!-- Header with branding -->
    <div class="flex flex-col items-center pt-16 pb-12">
      <span class="text-7xl font-bold text-white tracking-tight mb-5">
        DailySpin
      </span>
      <h1
        class="text-4xl font-medium tracking-widest uppercase text-neutral-300"
      >
        {{ monthName }}
        {{ year }}
      </h1>
    </div>

    <!-- Calendar grid -->
    <div class="flex-1 px-8">
      <MonthlySummaryCalendarGrid :days="days" />
    </div>

    <!-- Stats footer -->
    <div class="flex flex-col items-center pt-12 pb-6">
      <div class="text-3xl font-semibold text-neutral-300 tracking-wide">
        {{ stats.totalAlbums }} Albums &bull; {{ stats.uniqueArtists }} Artists
      </div>
    </div>

    <!-- Watermark -->
    <div class="pb-12">
      <div class="w-44 h-px bg-neutral-600 mx-auto mb-5" />
      <p class="text-2xl text-neutral-500 text-center tracking-wider">
        dailyspin.app
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { format } from 'date-fns';
import { computed, ref } from 'vue';
import type {
  DayAlbum,
  MonthlyStats,
} from '~/composables/api/listens/useMonthlyListens';
import { SHARE_IMAGE_CONFIG } from '~/constants/shareConfig';

const props = defineProps<{
  year: number;
  month: number;
  days: DayAlbum[];
  stats: MonthlyStats;
}>();

const cardRef = ref<HTMLElement | null>(null);

// Format month name
const monthName = computed(() => {
  const date = new Date(props.year, props.month - 1, 1);
  return format(date, 'MMMM');
});

// Style for the fixed aspect ratio container
const cardStyle = computed(() => ({
  width: `${SHARE_IMAGE_CONFIG.width}px`,
  height: `${SHARE_IMAGE_CONFIG.height}px`,
}));

// Expose the card element for image generation
defineExpose({
  cardRef,
});
</script>

<style scoped>
/* Uses app's default font */
</style>
