<script setup lang="ts">
import { endOfMonth, format, isPast, isToday } from 'date-fns';
import { computed, ref, watch } from 'vue';
import { Icons } from '~/components/common/icons';
import { usePreloadedShareImage } from '~/composables/features/usePreloadedShareImage';
import { useShareImage } from '~/composables/features/useShareImage';
import { SHARE_IMAGE_CONFIG } from '~/constants/shareConfig';

const route = useRoute();
const router = useRouter();

// Month picker state (parse route params or use current month as default)
const { year, month, selectedMonth, monthOptions, monthTitle } = useMonthPicker(
  {
    initialYear: route.params.year ? Number(route.params.year) : undefined,
    initialMonth: route.params.month ? Number(route.params.month) : undefined,
  },
);

// Check if the selected month is complete (last day or past)
const isMonthComplete = computed(() => {
  const lastDayOfMonth = endOfMonth(new Date(year.value, month.value - 1, 1));
  return isToday(lastDayOfMonth) || isPast(lastDayOfMonth);
});

// Update URL when month changes
watch([year, month], ([newYear, newMonth]) => {
  router.replace(`/summary/${newYear}/${newMonth}`);
});

// Fetch monthly listens
const { days, stats, loading, error, hasListens } = useMonthlyListens(
  year,
  month,
);

// Share card ref
const shareCardRef = ref<InstanceType<
  typeof import('~/components/MonthlySummary/MonthlySummaryShareCard.vue').default
> | null>(null);

// Share image utilities
const { downloadImage, shareImage, canShare } = useShareImage();

// Preload image in background when data is ready and month is complete
const shouldPreload = computed(
  () => hasListens.value && !loading.value && isMonthComplete.value,
);

const { getImage, isWaiting } = usePreloadedShareImage({
  getElement: () => shareCardRef.value?.cardRef,
  shouldPreload,
});

// Generate filename for download
const getFilename = () => {
  const date = new Date(year.value, month.value - 1, 1);
  return `dailyspin-${format(date, 'yyyy-MM').toLowerCase()}`;
};

// Handle download
const handleDownload = async () => {
  if (!shareCardRef.value?.cardRef) return;

  try {
    const blob = await getImage();
    downloadImage(blob, getFilename());
  } catch (error) {
    console.error('Failed to generate image:', error);
  }
};

// Handle share (mobile only)
const handleShare = async () => {
  if (!shareCardRef.value?.cardRef) return;

  try {
    const blob = await getImage();
    const shared = await shareImage(blob, getFilename());

    // Fall back to download if share isn't supported
    if (!shared) {
      downloadImage(blob, getFilename());
    }
  } catch (error) {
    console.error('Failed to generate image:', error);
  }
};
</script>

<template>
  <div class="h-[calc(100vh-var(--ui-header-height))] overflow-y-auto">
    <main class="max-w-200 mx-auto p-4 md:p-6 w-full">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 class="m-0 text-2xl md:text-[32px] font-black text-highlighted">
          Monthly Recap
        </h1>

        <div class="flex items-center gap-3">
          <!-- Action buttons (only show when there's data) -->
          <template v-if="hasListens && !loading">
            <UTooltip
              :text="
                isMonthComplete
                  ? undefined
                  : 'Unlocks at the end of the month'
              "
            >
              <UButton
                color="neutral"
                variant="soft"
                :icon="Icons.DOWNLOAD"
                :loading="isWaiting"
                :disabled="isWaiting || !isMonthComplete"
                @click="handleDownload"
              >
                Download
              </UButton>
            </UTooltip>

            <UTooltip
              v-if="canShare()"
              :text="
                isMonthComplete
                  ? undefined
                  : 'Unlocks at the end of the month'
              "
            >
              <UButton
                color="primary"
                :icon="Icons.SHARE"
                :loading="isWaiting"
                :disabled="isWaiting || !isMonthComplete"
                @click="handleShare"
              >
                Share
              </UButton>
            </UTooltip>
          </template>

          <!-- Month picker as text dropdown -->
          <USelectMenu
            v-model="selectedMonth"
            :items="monthOptions"
            class="font-semibold text-lg"
          >
            <template #leading>
              <UIcon :name="Icons.CALENDAR.DAYS" class="size-5" />
            </template>
          </USelectMenu>
        </div>
      </div>

      <!-- Month incomplete notice -->
      <p
        v-if="hasListens && !loading && !isMonthComplete"
        class="text-sm text-muted text-center mb-6"
      >
        Keep listening! Download and share unlocks at the end of the month.
      </p>

      <!-- Loading state -->
      <div v-if="loading" class="flex justify-center">
        <USkeleton class="w-full max-w-sm aspect-9/16 rounded-lg" />
      </div>

      <!-- Error state for fetch failure -->
      <div
        v-else-if="error"
        class="flex flex-col items-center justify-center text-center py-12 px-6"
      >
        <UIcon :name="Icons.WARNING" class="size-12 text-neutral-500 mb-4" />
        <p class="text-lg font-medium text-muted">{{ error.message }}</p>
      </div>

      <!-- Empty state when no listens -->
      <div
        v-else-if="!hasListens"
        class="flex flex-col items-center justify-center text-center py-12 px-6"
      >
        <UIcon
          :name="Icons.MUSIC.ALBUMS"
          class="size-16 text-neutral-600 mb-4"
        />
        <p class="text-xl font-semibold text-highlighted mb-2">
          No albums logged
        </p>
        <p class="text-muted max-w-xs">
          You haven't listened to any albums in {{ monthTitle }} yet.
        </p>
      </div>

      <!-- Content with data -->
      <template v-else>
        <div class="flex flex-col items-center">
          <!-- Share card preview (scaled down for display) -->
          <div
            class="relative w-full max-w-sm overflow-hidden rounded-lg shadow-xl mb-8"
            :style="{
              height: `${SHARE_IMAGE_CONFIG.height * (384 / SHARE_IMAGE_CONFIG.width)}px`,
            }"
          >
            <div
              class="origin-top-left"
              :style="{
                transform: `scale(${384 / SHARE_IMAGE_CONFIG.width})`,
                width: `${SHARE_IMAGE_CONFIG.width}px`,
                height: `${SHARE_IMAGE_CONFIG.height}px`,
              }"
            >
              <MonthlySummaryShareCard
                ref="shareCardRef"
                :year="year"
                :month="month"
                :days="days"
                :stats="stats"
              />
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>
