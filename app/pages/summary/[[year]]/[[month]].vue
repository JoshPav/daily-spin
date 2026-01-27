<script setup lang="ts">
import { format } from 'date-fns';
import { ref, watch } from 'vue';
import { Icons } from '~/components/common/icons';
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

// Share image composable
const { generateImage, downloadImage, shareImage, canShare } = useShareImage();
const isGenerating = ref(false);

// Generate filename for download
const getFilename = () => {
  const date = new Date(year.value, month.value - 1, 1);
  return `dailyspin-${format(date, 'yyyy-MM').toLowerCase()}`;
};

// Handle download
const handleDownload = async () => {
  if (!shareCardRef.value?.cardRef) return;

  isGenerating.value = true;
  try {
    const blob = await generateImage(shareCardRef.value.cardRef);
    downloadImage(blob, getFilename());
  } finally {
    isGenerating.value = false;
  }
};

// Handle share (mobile only)
const handleShare = async () => {
  if (!shareCardRef.value?.cardRef) return;

  isGenerating.value = true;
  try {
    const blob = await generateImage(shareCardRef.value.cardRef);
    const shared = await shareImage(blob, getFilename());

    // Fall back to download if share isn't supported
    if (!shared) {
      downloadImage(blob, getFilename());
    }
  } finally {
    isGenerating.value = false;
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
            <UButton
              color="neutral"
              variant="soft"
              :icon="Icons.DOWNLOAD"
              :loading="isGenerating"
              :disabled="isGenerating"
              @click="handleDownload"
            >
              Download
            </UButton>

            <UButton
              v-if="canShare()"
              color="primary"
              :icon="Icons.SHARE"
              :loading="isGenerating"
              :disabled="isGenerating"
              @click="handleShare"
            >
              Share
            </UButton>
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
