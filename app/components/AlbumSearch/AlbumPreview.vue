<template>
  <div class="flex gap-4 items-center">
    <img
      v-if="album.images?.[0]?.url"
      :src="album.images[0].url"
      :alt="album.name"
      class="w-20 h-20 shrink-0 rounded-lg object-cover"
    >
    <div class="flex-1 flex flex-col gap-1">
      <div class="text-lg font-bold">{{ album.name }}</div>
      <div class="text-sm font-medium text-muted">
        {{ getArtistNames(album.artists) }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { getArtistNames } from '#shared/utils/albumUtils';

defineProps<{ album: SearchResult }>();
</script>
