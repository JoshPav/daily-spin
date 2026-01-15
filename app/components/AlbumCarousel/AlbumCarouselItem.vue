<template>
  <div class="flex flex-col gap-2 w-full">
    <section class="flex-1 min-w-0 flex flex-col md:flex-row md:gap-6">

      <div class="shrink-0 w-full aspect-square md:w-75 md:h-75 md:aspect-auto rounded-lg overflow-hidden bg-default shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
        <NuxtImg
          v-if="albumListen.album.imageUrl"
          :src="albumListen.album.imageUrl"
          :alt="`${albumListen.album.albumName} cover`"
          class="w-full h-full object-cover"
        />
      </div>

      <div class="mt-6 md:mt-0 md:flex md:flex-col md:justify-center">
        <h2 class="mb-2 text-2xl md:text-[32px] font-black text-default leading-tight">{{ albumListen.album.albumName }}</h2>
        <p class="mb-3 text-base font-semibold text-muted">{{ albumListen.album.artists[0]?.name }}</p>

      </div>
    </section>

    <USeparator class="my-4"   />

    <!-- Listen Details -->
    <section>
      <h3 class="mb-4 font-semibold">Listen info</h3>
      <!-- Info Chips -->
      <section class="flex flex-wrap gap-4 mb-2">
        <ListenInfoItem
          label="Listened"
          :text="LISTEN_ORDER_CONFIG[albumListen.listenMetadata.listenOrder].label"
          :icon="LISTEN_ORDER_CONFIG[albumListen.listenMetadata.listenOrder].icon"
        />

        <ListenInfoItem
          v-if="listenTime"
          label="Time"
          :text="LISTEN_TIME_CONFIG[listenTime].label"
          :icon="LISTEN_TIME_CONFIG[listenTime].icon"
        />

        <ListenInfoItem
          label="Listen Method"
          :text="LISTEN_METHOD_CONFIG[listenMethod].label"
          :icon="LISTEN_METHOD_CONFIG[listenMethod].icon"
        />
      </section>
    </section>
    <div>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { DailyAlbumListen } from '#shared/schema';
import {
  LISTEN_METHOD_CONFIG,
  LISTEN_ORDER_CONFIG,
  LISTEN_TIME_CONFIG,
} from '~/constants/listenMetadata';

const { albumListen } = defineProps<{
  albumListen: DailyAlbumListen;
}>();

const listenTime = computed(() => albumListen.listenMetadata.listenTime);
const listenMethod = computed(() => albumListen.listenMetadata.listenMethod);
</script>
