<template>
  <UModal
    title="Add to Backlog"
    description="Search for albums to add to your backlog"
    :content="{ onOpenAutoFocus: (e) => e.preventDefault() }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <!-- Search input -->
        <div class="search-section">
          <input
            v-model="searchInput"
            type="text"
            placeholder="Search for an album..."
            class="search-input"
            @input="handleSearchInput"
          />
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="search-results">
          <div v-for="i in 3" :key="i" class="album-card skeleton"></div>
        </div>

        <!-- Search results with multi-select -->
        <div v-else-if="searchResults.length > 0" class="search-results">
          <div
            v-for="album in searchResults"
            :key="album.id"
            class="album-card"
            :class="{ selected: isSelected(album) }"
            @click="toggleSelection(album)"
          >
            <div class="checkbox-wrapper">
              <UIcon
                v-if="isSelected(album)"
                name="i-heroicons-check-circle-solid"
                class="text-xl"
              />
              <UIcon
                v-else
                name="i-heroicons-plus-circle"
                class="text-xl text-gray-500"
              />
            </div>
            <img
              v-if="album.images?.[0]?.url"
              :src="album.images[0].url"
              :alt="album.name"
              class="album-image"
            />
            <div class="album-info">
              <div class="album-name">{{ album.name }}</div>
              <div class="artist-names">{{ getArtistNames(album) }}</div>
            </div>
          </div>
        </div>

        <!-- Selected albums summary -->
        <div v-if="selectedAlbums.length > 0" class="selected-summary">
          <div class="selected-count">
            {{ selectedAlbums.length }} album{{
              selectedAlbums.length === 1 ? '' : 's'
            }}
            selected
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            @click="clearSelection"
          >
            Clear
          </UButton>
        </div>

        <!-- Add button -->
        <UButton
          v-if="selectedAlbums.length > 0"
          block
          color="primary"
          size="lg"
          :loading="saving"
          @click="handleAdd"
        >
          Add {{ selectedAlbums.length }} Album{{
            selectedAlbums.length === 1 ? '' : 's'
          }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script lang="ts" setup>
import type { SearchResult } from '~/composables/api/useSpotifyAlbumSearch';

const emit = defineEmits<{
  close: [];
  added: [];
}>();

const { searchResults, loading, search } = useSpotifyAlbumSearch();
const {
  selectedAlbums,
  saving,
  isSelected,
  toggleSelection,
  clearSelection,
  addToBacklog,
} = useAddToBacklog({
  onSuccess: () => {
    emit('added');
    emit('close');
  },
});

const searchInput = ref('');

const handleSearchInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  search(target.value);
};

const getArtistNames = (album: SearchResult) =>
  album.artists.map((a) => a.name).join(', ');

const handleAdd = async () => {
  await addToBacklog();
};
</script>

<style scoped>
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
  max-height: 300px;
  overflow-y: auto;
  overflow-x: hidden;
}

.album-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: #282828;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  align-items: center;
}

.album-card:hover {
  background-color: #333333;
}

.album-card.selected {
  background-color: #1db954;
}

.album-card.skeleton {
  height: 80px;
  background: linear-gradient(
    90deg,
    #2a2a2a 25%,
    #3a3a3a 37%,
    #2a2a2a 63%
  );
  background-size: 400% 100%;
  animation: skeleton-shimmer 2.5s ease infinite;
}

.checkbox-wrapper {
  flex-shrink: 0;
}

.album-image {
  width: 56px;
  height: 56px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.album-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.album-name {
  font-family: 'Montserrat', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-card.selected .album-name {
  color: #000000;
}

.artist-names {
  font-family: 'Montserrat', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #b3b3b3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-card.selected .artist-names {
  color: #121212;
}

.selected-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #1a1a1a;
  border-radius: 8px;
}

.selected-count {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #1db954;
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
