<template>
  <UModal
    :title="modalHeader"
    :description="modalSubheading"
    :content="{ onOpenAutoFocus: (e) => e.preventDefault() }"
  >
    <template #body>
      <SongOfTheDay
        :song="favoriteSong"
        :album-name="favoriteSongAlbumName"
        :disabled="saving"
        class="mb-4"
        @clear="handleClearSelection"
        @placeholder-click="handlePlaceholderClick"
      />

      <USeparator class="mb-4" />

      <AlbumCarousel
        v-if="dailyListens"
        ref="carouselRef"
        :albums="sortedAlbums"
        :favorite-song="favoriteSong"
        :disabled="saving"
        @select-track="handleSelectTrack"
        @toggle-no-skip="handleToggleNoSkip"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { AlbumTrack } from '~/composables/api/spotify/useAlbumTracks';
import { sortAlbumListensByFavorite } from '~/utils/albums.utils';
import { formatDate } from '~/utils/dateUtils';
import type { DailyListens, FavoriteSong } from '~~/shared/schema';

const props = defineProps<{
  dailyListens: DailyListens;
  onFavoriteSongUpdate: (
    date: string,
    favoriteSong: FavoriteSong | null,
  ) => void;
  onNoSkipUpdate?: (
    date: string,
    spotifyAlbumId: string,
    noSkip: boolean,
  ) => void;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { saving, updateFavoriteSong, clearFavoriteSong } = useFavoriteSong({
  onUpdate: props.onFavoriteSongUpdate,
});

const { toggleNoSkip } = useNoSkip();

// Ref to carousel for programmatic control
const carouselRef = ref<InstanceType<typeof AlbumCarousel>>();

// Local state for albums (allows optimistic no-skip updates)
const localAlbums = ref(props.dailyListens.albums);

// Local state for favorite song (allows optimistic updates)
const favoriteSong = ref<FavoriteSong | null>(props.dailyListens.favoriteSong);

// Sync with props when they change
watch(
  () => props.dailyListens.favoriteSong,
  (newValue) => {
    favoriteSong.value = newValue;
  },
);

const modalHeader = computed(() =>
  props.dailyListens ? formatDate(new Date(props.dailyListens.date)) : '',
);

const albumCount = computed(() => localAlbums.value.length);

// Sort albums with favorite first for carousel display
const sortedAlbums = computed(() =>
  sortAlbumListensByFavorite(localAlbums.value, favoriteSong.value),
);

// Find the album name for the favorite song
const favoriteSongAlbumName = computed(() => {
  if (!favoriteSong.value || albumCount.value === 1) return '';

  const album = localAlbums.value.find(
    (a) => a.album.albumId === favoriteSong.value?.albumId,
  );
  return album?.album.albumName ?? '';
});

const modalSubheading = computed(() => {
  if (albumCount.value === 0) {
    return 'No albums listened';
  }

  if (albumCount.value === 1) {
    return '1 album listened';
  }

  return `${albumCount.value} albums listened`;
});

const handleSelectTrack = async (track: AlbumTrack, albumId: string) => {
  if (saving.value) return;

  const previousValue = favoriteSong.value;
  favoriteSong.value = {
    spotifyId: track.id,
    name: track.name,
    trackNumber: track.trackNumber,
    albumId,
  };

  try {
    await updateFavoriteSong(props.dailyListens.date, {
      spotifyId: track.id,
      name: track.name,
      trackNumber: track.trackNumber,
      albumId,
    });
  } catch {
    // Revert on error
    favoriteSong.value = previousValue;
  }
};

const handleClearSelection = async () => {
  if (saving.value) return;

  const previousValue = favoriteSong.value;
  favoriteSong.value = null;

  try {
    await clearFavoriteSong(props.dailyListens.date);
  } catch {
    // Revert on error
    favoriteSong.value = previousValue;
  }
};

const handleToggleNoSkip = async (spotifyAlbumId: string, noSkip: boolean) => {
  // Optimistic update
  const previousAlbums = localAlbums.value;
  localAlbums.value = localAlbums.value.map((a) =>
    a.album.albumId === spotifyAlbumId
      ? { ...a, listenMetadata: { ...a.listenMetadata, noSkip } }
      : a,
  );

  try {
    await toggleNoSkip(spotifyAlbumId, noSkip);
    props.onNoSkipUpdate?.(props.dailyListens.date, spotifyAlbumId, noSkip);
  } catch {
    // Revert on error
    localAlbums.value = previousAlbums;
  }
};

const handlePlaceholderClick = () => {
  // Expand the first album's track list
  carouselRef.value?.expandFirstItem();
};
</script>
