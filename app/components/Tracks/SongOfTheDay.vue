<template>
  <section>
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-semibold">Song of the Day</h3>
      <button
        v-if="song"
        :disabled="disabled"
        class="text-sm text-muted hover:text-default transition-colors disabled:opacity-50"
        @click="$emit('clear')"
      >
        Clear
      </button>
    </div>

    <div
      class="flex items-center gap-3 p-3 rounded-lg border"
      :class="[
        song
          ? 'border-green-500 bg-green-500/10'
          : 'border-dashed border-gray-600 cursor-pointer hover:border-gray-500 hover:bg-gray-800/50 transition-colors',
      ]"
      @click="!song && $emit('placeholderClick')"
    >
      <UIcon
        name="i-lucide-music"
        class="text-lg"
        :class="song ? 'text-green-500' : 'text-muted'"
      />

      <template v-if="song">
        <span class="flex-1 min-w-0 overflow-hidden">
          <span class="text-muted text-sm">{{ song.trackNumber }}.</span>
          {{ song.name }}
          <span v-if="albumName" class="text-muted text-sm">
            · {{ albumName }}
          </span>
        </span>

        <OpenInSpotifyButton :spotify-id="song.spotifyId" type="track" />
      </template>

      <span v-else class="flex-1 text-muted text-sm">
        Select a track from an album below
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { FavoriteSong } from '~~/shared/schema';

defineProps<{
  song: FavoriteSong | null;
  albumName?: string;
  disabled?: boolean;
}>();

defineEmits<{
  clear: [];
  placeholderClick: [];
}>();
</script>
