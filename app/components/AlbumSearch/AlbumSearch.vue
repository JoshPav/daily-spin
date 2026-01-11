<template>
  <div class="album-search">
    <div class="search-section">
      <input
        v-model="searchInput"
        type="text"
        placeholder="Search for an album..."
        class="search-input"
        @input="handleSearchInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />
    </div>

    <div v-if="loading && isFocused" class="search-results">
      <div v-for="i in 3" :key="i" class="album-card skeleton"></div>
    </div>

    <div v-else-if="searchResults.length > 0 && isFocused" class="search-results">
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
import type { SearchResult } from '~/composables/api/useAlbumSearch';

const props = defineProps<{
  modelValue: SearchResult | undefined;
}>();

const emit = defineEmits<{
  'update:modelValue': [album: SearchResult | undefined];
}>();

const { searchResults, loading, search } = useAlbumSearch();

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
.album-search {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  background-color: #282828;
  border: 2px solid #404040;
  border-radius: 8px;
  color: #ffffff;
  font-family: 'Montserrat', sans-serif;
  font-size: 16px;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #1db954;
}

.search-input::placeholder {
  color: #b3b3b3;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
