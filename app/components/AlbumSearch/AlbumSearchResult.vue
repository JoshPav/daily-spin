<template>
  <div
    :key="album.id"
    class="flex cursor-pointer gap-4 rounded-lg p-3 transition-all hover:translate-x-1"
    :class="selected ? 'bg-green-500' : 'bg-elevated hover:bg-muted'"
    @click="onClick"
  >
    <img
      v-if="album.images?.[0]?.url"
      :src="album.images[0].url"
      :alt="album.name"
      class="h-16 w-16 shrink-0 rounded object-cover"
    >
    <div class="flex flex-1 flex-col justify-center gap-1">
      <div
        class="font-montserrat text-base font-bold"
        :class="selected ? 'text-black' : 'text-white'"
      >
        {{ album.name }}
      </div>
      <div
        class="font-montserrat text-sm font-medium"
        :class="selected ? 'text-neutral-900' : 'text-neutral-400'"
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
