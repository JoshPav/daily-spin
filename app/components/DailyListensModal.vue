<template>
  <UModal
    :title="modalHeader"
    :description="modalSubheading"
    :content="{ onOpenAutoFocus: (e) => e.preventDefault() }"
  >
    <template #body>
      <AlbumCarousel v-if="dailyListens" :albums="dailyListens.albums" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { formatDate } from '~/utils/dateUtils';
import type { DailyListens } from '~~/shared/schema';

const { dailyListens } = defineProps<{ dailyListens: DailyListens }>();

const emit = defineEmits<{
  close: [];
}>();

const modalHeader = computed(() =>
  dailyListens ? formatDate(new Date(dailyListens.date)) : '',
);

const modalSubheading = computed(() => {
  const albumCount = dailyListens.albums.length;

  if (albumCount === 0) {
    return 'No albums listened';
  }

  if (albumCount === 1) {
    return '1 album listened';
  }

  return `${albumCount} albums listened`;
});
</script>

<style scoped>
</style>
