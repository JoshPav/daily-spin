<template>
  <div class="flex flex-col gap-2 md:gap-4 w-full">
    <!-- Album header: artwork + info -->
    <section class="flex-1 min-w-0 flex flex-col md:flex-row md:gap-6">
      <div
        class="relative shrink-0 w-full aspect-square md:w-75 md:h-75 md:aspect-auto rounded-lg overflow-hidden bg-default shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
      >
        <NuxtImg
          v-if="album.imageUrl"
          :src="album.imageUrl"
          :alt="`${album.name} cover`"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full flex items-center justify-center">
          <UIcon name="i-lucide-disc-3" class="text-6xl text-neutral-500" />
        </div>
        <OpenInSpotifyButton
          :spotify-id="album.spotifyId"
          type="album"
          class="absolute bottom-3 right-3"
        />
      </div>

      <div class="mt-4 md:mt-0 md:flex md:flex-col md:justify-center">
        <h2
          class="text-2xl md:text-[32px] font-black text-default leading-tight md:mb-2"
        >
          {{ album.name }}
        </h2>
        <p class="mb-2 md:mb-3 text-base font-semibold text-muted">
          {{ artistNames }}
        </p>
        <p v-if="album.releaseDate" class="text-sm text-muted">
          {{ formatReleaseDate(album.releaseDate) }}
        </p>
      </div>
    </section>

    <!-- Track List -->
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
      <div ref="trackListEnd" />
    </CollapsibleSection>
  </div>
</template>

<script setup lang="ts">
import { formatReleaseDate } from '#shared/utils/albumUtils';
import { Icons } from '~/components/common/icons';
import type { AlbumTrack } from '~/composables/api/spotify/useAlbumTracks';

export interface AlbumDetailsAlbum {
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  artists: Array<{ name: string }>;
  releaseDate?: string | null;
}

const props = defineProps<{
  album: AlbumDetailsAlbum;
  selectedTrackId?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  trackSelect: [track: AlbumTrack];
}>();

// Track list expansion
const expanded = ref(false);
const trackListEnd = ref<HTMLElement | null>(null);
const { tracks, loading, error, fetchTracks } = useAlbumTracks();

const artistNames = computed(() =>
  props.album.artists.map((a) => a.name).join(', '),
);

// Expose methods for parent to control expansion
const expand = () => {
  expanded.value = true;
};

const collapse = () => {
  expanded.value = false;
};

defineExpose({ expand, collapse });

// Fetch tracks when expanded for the first time and scroll into view
watch(expanded, async (isExpanded) => {
  if (isExpanded) {
    if (tracks.value.length === 0) {
      fetchTracks(props.album.spotifyId);
    }
    // Wait for content to render and animation to complete
    await nextTick();
    setTimeout(() => {
      trackListEnd.value?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 150);
  }
});

const handleTrackSelect = (track: AlbumTrack) => {
  emit('trackSelect', track);
};
</script>
