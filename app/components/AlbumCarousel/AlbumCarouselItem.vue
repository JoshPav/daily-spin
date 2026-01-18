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

      <div class="mt-4 md:mt-0 md:flex md:flex-col md:justify-center">
        <div class="flex items-center gap-3 md:mb-2 justify-between">
          <h2
            class="text-2xl md:text-[32px] font-black text-default leading-tight"
          >
            {{ albumListen.album.albumName }}
          </h2>
          <OpenInSpotifyButton
            :spotify-id="albumListen.album.albumId"
            type="album"
            size="md"
          />
        </div>
        <p class="mb-2 md:mb-3 text-base font-semibold text-muted">
          {{ albumListen.album.artists[0]?.name }}
        </p>
      </div>
    </section>

    <!-- Track List -->
    <section>
      <CollapsibleSection v-model="expanded" :icon="Icons.MUSIC.SONG_LIST">
        <template #trigger>
          <span class="flex-1 text-left">View tracks</span>
        </template>

        <TrackList
          :tracks="tracks"
          :selected-track-id="selectedTrackId"
          :disabled="disabled"
          :loading="loading"
          :error="error"
          @select="handleTrackSelect"
        />
      </CollapsibleSection>
    </section>

    <USeparator ref="trackListDivider" class="my-1 md:my-4" />

    <!-- Listen Details -->
    <section>
      <h3 class="mb-4 font-semibold">Listen info</h3>
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
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';
import type { DailyAlbumListen, FavoriteSong } from '#shared/schema';
import type { AlbumTrack } from '~/composables/api/useAlbumTracks';
import {
  LISTEN_METHOD_CONFIG,
  LISTEN_ORDER_CONFIG,
  LISTEN_TIME_CONFIG,
} from '~/constants/listenMetadata';
import { Icons } from '../common/icons';

const props = defineProps<{
  albumListen: DailyAlbumListen;
  favoriteSong: FavoriteSong | null;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  selectTrack: [track: AlbumTrack, albumId: string];
}>();

const listenTime = computed(() => props.albumListen.listenMetadata.listenTime);
const listenMethod = computed(
  () => props.albumListen.listenMetadata.listenMethod,
);

// Expose methods for parent to control expansion
const expand = () => {
  expanded.value = true;
};

const collapse = () => {
  expanded.value = false;
};

defineExpose({ expand, collapse });

// Track list expansion
const expanded = ref(false);
const trackListDivider = ref<ComponentPublicInstance | null>(null);
const { tracks, loading, error, fetchTracks } = useAlbumTracks();

// Only highlight track if the favorite song is from this album
const selectedTrackId = computed(() =>
  props.favoriteSong?.albumId === props.albumListen.album.albumId
    ? props.favoriteSong.spotifyId
    : undefined,
);

// Fetch tracks when expanded for the first time and scroll into view
watch(expanded, async (isExpanded) => {
  if (isExpanded) {
    if (tracks.value.length === 0) {
      fetchTracks(props.albumListen.album.albumId);
    }
    // Wait for content to render and animation to complete
    await nextTick();
    setTimeout(() => {
      const dividerEl = trackListDivider.value?.$el as HTMLElement | undefined;
      dividerEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }
});

const handleTrackSelect = (track: AlbumTrack) => {
  emit('selectTrack', track, props.albumListen.album.albumId);
  // Collapse after selection
  expanded.value = false;
};
</script>
