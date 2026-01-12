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
        <p class="mb-3 text-base font-semibold text-muted">{{ albumListen.album.artistNames }}</p>

      </div>
    </section>

    <USeparator class="my-4"   />

    <!-- Listen Details -->
    <section>
      <h3 class="mb-4 font-semibold">Listen info</h3>
      <!-- Info Chips -->
      <section class="flex gap-4 mb-2">
        <ListenInfoItem
          label="Listened"
          :text="albumListen.listenMetadata.inOrder ? 'Ordered' : 'Shuffled'"
          :icon="albumListen.listenMetadata.inOrder ? 'i-lucide-list-ordered' : 'i-lucide-shuffle'"
        />

        <ListenInfoItem
          v-if="listenTime"
          label="Time"
          :text="timeMap[listenTime].text"
          :icon="timeMap[listenTime].icon"
        />

        <ListenInfoItem 
          label="Listen Method"
          :text="listenMethodMap[listenMethod].text"
          :icon="listenMethodMap[listenMethod].icon"
        />
      </section>
    </section>
    <div>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { ListenMethod } from '@prisma/client';
import { type Component, h } from 'vue';
import type { DailyAlbumListen, ListenTime } from '#shared/schema';
import SpotifyIconSvg from '~/components/common/Icons/SpotifyIcon.vue';

const { albumListen } = defineProps<{
  albumListen: DailyAlbumListen;
}>();

const listenTime = computed(() => albumListen.listenMetadata.listenTime);
const listenMethod = computed(() => albumListen.listenMetadata.listenMethod);

const SpotifyIcon = () => h(SpotifyIconSvg);

const listenMethodMap: Record<
  ListenMethod,
  { text: string; icon: string | Component }
> = {
  spotify: { text: 'Spotify', icon: SpotifyIcon },
  vinyl: { text: 'Vinyl', icon: 'i-lucide-disc-3' },
  streamed: { text: 'Streamed', icon: 'i-lucide-audio-lines' },
};

const timeMap: Record<ListenTime, { text: string; icon: string }> = {
  morning: { text: 'Morning', icon: 'i-lucide-sunrise' },
  noon: { text: 'Afternoon', icon: 'i-lucide-sun' },
  evening: { text: 'Evening', icon: 'i-lucide-sunset' },
  night: { text: 'Night', icon: 'i-lucide-moon-star' },
};
</script>
