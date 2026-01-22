<template>
  <div class="flex flex-col gap-2 w-full">
    <AlbumDetails
      ref="albumDetailsRef"
      :album="album"
      :selected-track-id="selectedTrackId"
      :disabled="disabled"
      @track-select="handleTrackSelect"
    />

    <USeparator class="my-1 md:my-4" />

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
import type { DailyAlbumListen, FavoriteSong } from '#shared/schema';
import type { AlbumDetailsAlbum } from '~/components/AlbumDetails/AlbumDetails.vue';
import type { AlbumTrack } from '~/composables/api/spotify/useAlbumTracks';
import {
  LISTEN_METHOD_CONFIG,
  LISTEN_ORDER_CONFIG,
  LISTEN_TIME_CONFIG,
} from '~/constants/listenMetadata';

const props = defineProps<{
  albumListen: DailyAlbumListen;
  favoriteSong: FavoriteSong | null;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  selectTrack: [track: AlbumTrack, albumId: string];
}>();

const albumDetailsRef = ref<InstanceType<typeof AlbumDetails> | null>(null);

const listenTime = computed(() => props.albumListen.listenMetadata.listenTime);
const listenMethod = computed(
  () => props.albumListen.listenMetadata.listenMethod,
);

// Map DailyAlbumListen to AlbumDetailsAlbum
const album = computed<AlbumDetailsAlbum>(() => ({
  spotifyId: props.albumListen.album.albumId,
  name: props.albumListen.album.albumName,
  imageUrl: props.albumListen.album.imageUrl,
  artists: props.albumListen.album.artists,
  releaseDate: props.albumListen.album.releaseDate,
}));

// Only highlight track if the favorite song is from this album
const selectedTrackId = computed(() =>
  props.favoriteSong?.albumId === props.albumListen.album.albumId
    ? props.favoriteSong.spotifyId
    : undefined,
);

// Expose methods for parent to control expansion
const expand = () => {
  albumDetailsRef.value?.expand();
};

const collapse = () => {
  albumDetailsRef.value?.collapse();
};

defineExpose({ expand, collapse });

const handleTrackSelect = (track: AlbumTrack) => {
  emit('selectTrack', track, props.albumListen.album.albumId);
  // Collapse after selection
  albumDetailsRef.value?.collapse();
};
</script>
