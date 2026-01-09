<template>
  <Carousel :items="albums" :loop="true">
    <template #default="{ item, index }">
      <AlbumCarouselItem
        :album-listen="item"`
        :style="index === 0 && viewTransitionName
          ? { viewTransitionName }
          : undefined"
      />
    </template>
  </Carousel>
</template>

<script setup lang="ts">
import type { DailyAlbumListen } from '#shared/schema';

defineProps<{
  albums: DailyAlbumListen[];
  viewTransitionName?: string | null;
}>();
</script>
