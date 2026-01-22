<template>
  <div class="flex items-center gap-4">
    <img
      v-if="album.images?.[0]?.url"
      :src="album.images[0].url"
      :alt="album.name"
      class="h-20 w-20 shrink-0 rounded-lg object-cover"
    >
    <div class="flex flex-1 flex-col gap-1">
      <div class="font-montserrat text-lg font-bold text-white">
        {{ album.name }}
      </div>
      <div class="font-montserrat text-sm font-medium text-neutral-400">
        {{ getArtistNames(album.artists) }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { getArtistNames } from '#shared/utils/albumUtils';

defineProps<{ album: SearchResult }>();
</script>
