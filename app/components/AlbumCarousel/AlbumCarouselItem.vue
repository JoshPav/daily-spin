<template>
  <div class="flex flex-col gap-2 w-full">
    <section class="flex-1 min-w-0 flex flex-col md:flex-row md:gap-6">
      <div
        class="shrink-0 w-full aspect-square md:w-75 md:h-75 md:aspect-auto rounded-lg overflow-hidden bg-default shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
      >
        <NuxtImg
          v-if="albumListen.album.imageUrl"
          :src="albumListen.album.imageUrl"
          :alt="`${albumListen.album.albumName} cover`"
          class="w-full h-full object-cover"
        />
      </div>

      <div class="mt-6 md:mt-0 md:flex md:flex-col md:justify-center">
        <h2
          class="mb-2 text-2xl md:text-[32px] font-black text-default leading-tight"
        >
          {{ albumListen.album.albumName }}
        </h2>
        <p class="mb-3 text-base font-semibold text-muted">
          {{ albumListen.album.artists[0]?.name }}
        </p>
      </div>
    </section>

    <USeparator class="my-4" />

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

    <USeparator class="my-4" />

    <!-- Favorite Song -->
    <section>
      <h3 class="mb-4 font-semibold">Favorite song</h3>
      <button
        class="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-600 hover:border-green-500 hover:bg-green-500/10 transition-colors text-left"
        :class="{
          'border-solid border-green-500 bg-green-500/10': favoriteSong,
        }"
        @click="openFavoriteSongModal"
      >
        <UIcon
          :name="favoriteSong ? 'i-lucide-music' : 'i-lucide-plus'"
          class="text-lg"
          :class="favoriteSong ? 'text-green-500' : 'text-muted'"
        />
        <span v-if="favoriteSong" class="flex-1">
          <span class="text-muted text-sm">{{ favoriteSong.trackNumber }}.</span>
          {{ favoriteSong.name }}
        </span>
        <span v-else class="flex-1 text-muted">Select favorite song</span>
        <UIcon
          v-if="favoriteSong"
          name="i-lucide-pencil"
          class="text-muted text-sm"
        />
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { DailyAlbumListen, FavoriteSong } from '#shared/schema';
import {
  LISTEN_METHOD_CONFIG,
  LISTEN_ORDER_CONFIG,
  LISTEN_TIME_CONFIG,
} from '~/constants/listenMetadata';

const props = defineProps<{
  albumListen: DailyAlbumListen;
}>();

const listenTime = computed(() => props.albumListen.listenMetadata.listenTime);
const listenMethod = computed(() => props.albumListen.listenMetadata.listenMethod);

// Local state for favorite song (allows optimistic updates)
const favoriteSong = ref<FavoriteSong | null>(
  props.albumListen.listenMetadata.favoriteSong,
);

// Sync with props when they change
watch(
  () => props.albumListen.listenMetadata.favoriteSong,
  (newValue) => {
    favoriteSong.value = newValue;
  },
);

const { open: openModal } = useFavoriteSongModal();

const openFavoriteSongModal = () => {
  openModal({
    albumListenId: props.albumListen.id,
    albumId: props.albumListen.album.albumId,
    albumName: props.albumListen.album.albumName,
    currentFavoriteSong: favoriteSong.value,
    onUpdated: (updatedFavoriteSong) => {
      favoriteSong.value = updatedFavoriteSong;
    },
  });
};
</script>
