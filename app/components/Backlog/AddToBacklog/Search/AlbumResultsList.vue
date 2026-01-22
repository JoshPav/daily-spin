<script setup lang="ts">
import type { SimplifiedAlbum } from '@spotify/web-api-ts-sdk';

const props = withDefaults(
  defineProps<{
    albums: SimplifiedAlbum[];
    loading?: boolean;
    emptyText?: string;
    isSelected?: (album: SimplifiedAlbum) => boolean;
    compact?: boolean;
  }>(),
  {
    loading: false,
    emptyText: 'No albums found',
    isSelected: () => false,
    compact: false,
  },
);

defineEmits<{
  select: [album: SimplifiedAlbum];
}>();

const skeletonCount = computed(() => (props.compact ? 5 : 8));
const skeletonHeight = computed(() => (props.compact ? 'h-20' : 'h-24'));
const resultsGap = computed(() => (props.compact ? 'gap-2' : 'gap-3'));
</script>

<template>
  <div class="min-h-0 flex-1 overflow-y-auto">
    <!-- Loading state -->
    <div v-if="loading" class="flex flex-col" :class="resultsGap">
      <div
        v-for="i in skeletonCount"
        :key="i"
        :class="skeletonHeight"
        class="animate-[skeleton-shimmer_2.5s_ease_infinite] rounded-lg bg-linear-to-r from-neutral-700 via-neutral-600 to-neutral-700 bg-size-[400%_100%]"
      />
    </div>

    <!-- Results list -->
    <div
      v-else-if="albums.length > 0"
      class="flex flex-col"
      :class="resultsGap"
    >
      <AlbumResultItem
        v-for="album in albums"
        :key="album.id"
        :album="album"
        :selected="isSelected(album)"
        :compact="compact"
        @click="$emit('select', album)"
      />
    </div>

    <!-- Empty state -->
    <div v-else class="py-8 text-center text-muted">{{ emptyText }}</div>
  </div>
</template>

<style scoped>
@keyframes skeleton-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
</style>
