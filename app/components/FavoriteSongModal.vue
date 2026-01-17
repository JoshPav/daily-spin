<template>
  <UModal
    :title="albumName"
    description="Select your favorite song"
    :content="{ onOpenAutoFocus: (e) => e.preventDefault() }"
  >
    <template #body>
      <div class="flex flex-col gap-2">
        <!-- Loading State -->
        <div v-if="loading" class="flex flex-col gap-2">
          <div
            v-for="i in 5"
            :key="i"
            class="h-12 bg-gray-800 rounded animate-pulse"
          />
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8 text-red-400">
          {{ error }}
        </div>

        <!-- Track List -->
        <div v-else class="max-h-80 overflow-y-auto flex flex-col gap-1">
          <button
            v-for="track in tracks"
            :key="track.id"
            class="track-item flex items-center gap-3 p-3 rounded-lg transition-colors text-left"
            :class="{
              'bg-green-500/20 border border-green-500':
                selectedTrackId === track.id,
              'hover:bg-white/5': selectedTrackId !== track.id,
            }"
            @click="selectTrack(track)"
          >
            <span class="w-6 text-center text-sm text-muted">
              {{ track.trackNumber }}
            </span>
            <span class="flex-1 truncate">{{ track.name }}</span>
            <span class="text-sm text-muted">
              {{ formatDuration(track.durationMs) }}
            </span>
            <UIcon
              v-if="selectedTrackId === track.id"
              name="i-lucide-check"
              class="text-green-500"
            />
          </button>
        </div>

        <!-- Clear Selection -->
        <button
          v-if="currentFavoriteSong && !loading"
          class="mt-2 text-sm text-muted hover:text-default transition-colors"
          @click="clearSelection"
        >
          Clear selection
        </button>

        <!-- Saving indicator -->
        <div v-if="saving" class="text-center text-sm text-muted mt-2">
          Saving...
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { FavoriteSong } from '#shared/schema';
import type { AlbumTrack } from '~/composables/api/useAlbumTracks';

const props = defineProps<{
  albumListenId: string;
  albumId: string;
  albumName: string;
  currentFavoriteSong: FavoriteSong | null;
}>();

const emit = defineEmits<{
  close: [];
  updated: [favoriteSong: FavoriteSong | null];
}>();

const { tracks, loading, error, fetchTracks } = useAlbumTracks();
const { saving, updateFavoriteSong, clearFavoriteSong } = useFavoriteSong();

const selectedTrackId = ref<string | null>(props.currentFavoriteSong?.spotifyId ?? null);

// Fetch tracks on mount
onMounted(() => {
  fetchTracks(props.albumId);
});

const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const selectTrack = async (track: AlbumTrack) => {
  if (saving.value) return;

  selectedTrackId.value = track.id;

  try {
    const result = await updateFavoriteSong(props.albumListenId, {
      spotifyId: track.id,
      name: track.name,
      trackNumber: track.trackNumber,
    });
    emit('updated', result);
  } catch {
    // Revert selection on error
    selectedTrackId.value = props.currentFavoriteSong?.spotifyId ?? null;
  }
};

const clearSelection = async () => {
  if (saving.value) return;

  selectedTrackId.value = null;

  try {
    await clearFavoriteSong(props.albumListenId);
    emit('updated', null);
  } catch {
    // Revert selection on error
    selectedTrackId.value = props.currentFavoriteSong?.spotifyId ?? null;
  }
};
</script>

<style scoped>
.track-item {
  border: 1px solid transparent;
}
</style>
