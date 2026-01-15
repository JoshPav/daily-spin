<template>
  <UCarousel
    :items="albums"
    loop
    :arrows="albums.length > 1"
    dots
    indicators
    :next="{ size: 'xl'}"
    :prev="{ size: 'xl'}"
    :ui="{
      dots: 'bottom-0 md:-bottom-2',
      arrows: '',
      prev: 'left-2 md:left-2 top-44',
      next: 'right-2 md:right-2 top-44'
    }"
  >
    <template #default="{ item }">
      <AlbumCarouselItem :album-listen="item" />
    </template>

  </UCarousel>
</template>

<script setup lang="ts">
import type { DailyAlbumListen } from '#shared/schema';

defineProps<{
  albums: DailyAlbumListen[];
}>();
</script>
