<script setup lang="ts">
import type { SimplifiedAlbum } from '@spotify/web-api-ts-sdk';

const props = withDefaults(
  defineProps<{
    isSelected?: (album: SimplifiedAlbum) => boolean;
  }>(),
  {
    isSelected: () => false,
  },
);

defineEmits<{
  select: [album: SimplifiedAlbum];
}>();

const { releases, loading, hasFetched, fetchNewReleases } =
  useSpotifyNewReleases();

// Fetch on mount
onMounted(() => {
  if (!hasFetched.value) {
    fetchNewReleases();
  }
});
</script>

<template>
  <AlbumResultsList
    :albums="releases"
    :loading="loading"
    :is-selected="isSelected"
    empty-text="No featured releases found"
    @select="$emit('select', $event)"
  />
</template>
