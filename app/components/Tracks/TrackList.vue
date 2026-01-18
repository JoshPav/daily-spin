<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col gap-2">
      <USkeleton v-for="i in 5" :key="i" class="h-10 w-full" />
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
        :disabled="disabled"
        class="flex items-center gap-3 p-2 rounded-lg transition-colors text-left disabled:opacity-50"
        :class="{
          'bg-green-500/20 border border-green-500':
            selectedTrackId === track.id,
          'hover:bg-white/5 border border-transparent':
            selectedTrackId !== track.id,
        }"
        @click="$emit('select', track)"
      >
        <span class="w-6 text-center text-sm text-muted">
          {{ track.trackNumber }}
        </span>
        <span class="flex-1 truncate text-sm">{{ track.name }}</span>
        <span class="text-xs text-muted">
          {{ formatDuration(track.durationMs) }}
        </span>
        <UIcon
          v-if="selectedTrackId === track.id"
          name="i-lucide-check"
          class="text-green-500"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AlbumTrack } from '~/composables/api/useAlbumTracks';

defineProps<{
  tracks: AlbumTrack[];
  selectedTrackId?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
}>();

defineEmits<{
  select: [track: AlbumTrack];
}>();

const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
</script>
