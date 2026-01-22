<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-2">
      <input
        v-model="searchInput"
        type="text"
        placeholder="Search for an album..."
        class="w-full rounded-lg border-2 border-neutral-600 bg-elevated px-4 py-3 font-montserrat text-base text-white transition-colors placeholder:text-neutral-400 focus:border-green-500 focus:outline-none"
        @input="handleSearchInput"
        @focus="handleFocus"
        @blur="handleBlur"
      >
    </div>

    <div
      v-if="loading && isFocused"
      class="flex max-h-[400px] flex-col gap-3 overflow-y-auto overflow-x-hidden"
    >
      <div v-for="i in 3" :key="i" class="skeleton h-20 rounded-lg" />
    </div>

    <div
      v-else-if="searchResults.length > 0 && isFocused"
      class="flex max-h-[400px] flex-col gap-3 overflow-y-auto overflow-x-hidden"
    >
      <AlbumSearchResult
        v-for="album in searchResults"
        :key="album.id"
        :album="album"
        :selected="album.id === modelValue?.id"
        @clicked="selectAlbum(album)"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { SearchResult } from '~/composables/api/spotify/useSpotifyAlbumSearch';

const props = defineProps<{
  modelValue: SearchResult | undefined;
}>();

const emit = defineEmits<{
  'update:modelValue': [album: SearchResult | undefined];
}>();

const { searchResults, loading, search } = useSpotifyAlbumSearch();

const searchInput = ref('');
const isFocused = ref(false);

const handleSearchInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  search(target.value);
};

const handleFocus = () => {
  isFocused.value = true;
};

const handleBlur = () => {
  // Delay blur to allow click events to fire first
  setTimeout(() => {
    isFocused.value = false;
  }, 200);
};

const selectAlbum = (album: SearchResult) => {
  emit('update:modelValue', album);
};
</script>

<style scoped>
.skeleton {
  background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 37%, #2a2a2a 63%);
  background-size: 400% 100%;
  animation: skeleton-shimmer 2.5s ease infinite;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
</style>
