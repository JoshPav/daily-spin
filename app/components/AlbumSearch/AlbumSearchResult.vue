<template>
  <div
    :key="album.id"
    class="flex gap-4 p-3 rounded-lg cursor-pointer transition-all duration-200 ease-out hover:translate-x-1"
    :class="selected ? 'bg-primary!' : 'bg-elevated hover:bg-muted'"
    @click="onClick"
  >
    <img
      v-if="album.images?.[0]?.url"
      :src="album.images[0].url"
      :alt="album.name"
      class="w-16 h-16 shrink-0 rounded object-cover"
    >
    <div class="flex-1 flex flex-col justify-center gap-1">
      <div class="text-base font-bold" :class="selected ? 'text-inverted' : ''">
        {{ album.name }}
      </div>
      <div
        class="text-sm font-medium"
        :class="selected ? 'text-inverted' : 'text-muted'"
      >
        {{ getArtistNames(album.artists) }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { getArtistNames } from '#shared/utils/albumUtils';

const { album } = defineProps<{ album: SearchResult; selected: boolean }>();

const emit = defineEmits<{
  clicked: [];
}>();

const onClick = () => emit('clicked');
</script>
