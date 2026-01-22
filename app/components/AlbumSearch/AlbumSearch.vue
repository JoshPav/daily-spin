<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-2">
      <input
        v-model="searchInput"
        type="text"
        placeholder="Search for an album..."
        class="w-full py-3 px-4 bg-elevated border-2 border-(--ui-border) rounded-lg text-base transition-[border-color] duration-200 ease-out focus:outline-none focus:border-primary placeholder:text-muted"
        @input="handleSearchInput"
        @focus="handleFocus"
        @blur="handleBlur"
      >
    </div>

    <div
      v-if="loading && isFocused"
      class="flex flex-col gap-3 max-h-[400px] overflow-y-auto overflow-x-hidden"
    >
      <USkeleton v-for="i in 3" :key="i" class="h-20 rounded-lg" />
    </div>

    <div
      v-else-if="searchResults.length > 0 && isFocused"
      class="flex flex-col gap-3 max-h-[400px] overflow-y-auto overflow-x-hidden"
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
