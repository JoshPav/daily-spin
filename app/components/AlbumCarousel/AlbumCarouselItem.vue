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

      <!-- Selected song display / expand button -->
      <button
        class="w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left"
        :class="
          expanded
            ? 'border-gray-600 bg-white/5'
            : favoriteSong
              ? 'border-solid border-green-500 bg-green-500/10'
              : 'border-dashed border-gray-600 hover:border-green-500 hover:bg-green-500/10'
        "
        @click="toggleExpanded"
      >
        <UIcon
          :name="favoriteSong ? 'i-lucide-music' : 'i-lucide-plus'"
          class="text-lg"
          :class="favoriteSong ? 'text-green-500' : 'text-muted'"
        />
        <span v-if="favoriteSong" class="flex-1">
          <span class="text-muted text-sm"
            >{{ favoriteSong.trackNumber }}.</span
          >
          {{ favoriteSong.name }}
        </span>
        <span v-else class="flex-1 text-muted">Select favorite song</span>
        <UIcon
          :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="text-muted"
        />
      </button>

      <!-- Expandable track list -->
      <div v-if="expanded" class="mt-2">
        <!-- Loading State -->
        <div v-if="loading" class="flex flex-col gap-2">
          <div
            v-for="i in 5"
            :key="i"
            class="h-10 bg-gray-800 rounded animate-pulse"
          />
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-4 text-red-400 text-sm">
          {{ error }}
        </div>

        <!-- Track List -->
        <div v-else class="max-h-60 overflow-y-auto flex flex-col gap-1">
          <button
            v-for="track in tracks"
            :key="track.id"
            :disabled="saving"
            class="track-item flex items-center gap-3 p-2 rounded-lg transition-colors text-left disabled:opacity-50"
            :class="{
              'bg-green-500/20 border border-green-500':
                favoriteSong?.spotifyId === track.id,
              'hover:bg-white/5 border border-transparent':
                favoriteSong?.spotifyId !== track.id,
            }"
            @click="selectTrack(track)"
          >
            <span class="w-6 text-center text-sm text-muted">
              {{ track.trackNumber }}
            </span>
            <span class="flex-1 truncate text-sm">{{ track.name }}</span>
            <span class="text-xs text-muted">
              {{ formatDuration(track.durationMs) }}
            </span>
            <UIcon
              v-if="favoriteSong?.spotifyId === track.id"
              name="i-lucide-check"
              class="text-green-500"
            />
          </button>
        </div>

        <!-- Clear Selection -->
        <button
          v-if="favoriteSong && !loading"
          :disabled="saving"
          class="mt-2 text-sm text-muted hover:text-default transition-colors disabled:opacity-50"
          @click="clearSelection"
        >
          Clear selection
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { DailyAlbumListen, FavoriteSong } from '#shared/schema';
import type { AlbumTrack } from '~/composables/api/useAlbumTracks';
import {
  LISTEN_METHOD_CONFIG,
  LISTEN_ORDER_CONFIG,
  LISTEN_TIME_CONFIG,
} from '~/constants/listenMetadata';

const props = defineProps<{
  albumListen: DailyAlbumListen;
}>();

const listenTime = computed(() => props.albumListen.listenMetadata.listenTime);
const listenMethod = computed(
  () => props.albumListen.listenMetadata.listenMethod,
);

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

// Track list expansion
const expanded = ref(false);
const { tracks, loading, error, fetchTracks } = useAlbumTracks();
const { saving, updateFavoriteSong, clearFavoriteSong } = useFavoriteSong();

const toggleExpanded = () => {
  expanded.value = !expanded.value;
  if (expanded.value && tracks.value.length === 0) {
    fetchTracks(props.albumListen.album.albumId);
  }
};

const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const selectTrack = async (track: AlbumTrack) => {
  if (saving.value) return;

  const previousValue = favoriteSong.value;
  favoriteSong.value = {
    spotifyId: track.id,
    name: track.name,
    trackNumber: track.trackNumber,
  };

  try {
    await updateFavoriteSong(props.albumListen.id, {
      spotifyId: track.id,
      name: track.name,
      trackNumber: track.trackNumber,
    });
  } catch {
    // Revert on error
    favoriteSong.value = previousValue;
  }
};

const clearSelection = async () => {
  if (saving.value) return;

  const previousValue = favoriteSong.value;
  favoriteSong.value = null;

  try {
    await clearFavoriteSong(props.albumListen.id);
  } catch {
    // Revert on error
    favoriteSong.value = previousValue;
  }
};
</script>
