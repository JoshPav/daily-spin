<template>
  <div
    :key="album.id"
    class="album-card"
    :class="{ selected }"
    @click="onClick"
  >
    <img
      v-if="album.images?.[0]?.url"
      :src="album.images[0].url"
      :alt="album.name"
      class="album-image"
    >
    <div class="album-info">
      <div class="album-name">{{ album.name }}</div>
      <div class="artist-names">{{ getArtistNames(album.artists) }}</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const { album } = defineProps<{ album: SearchResult; selected: boolean }>();

const emit = defineEmits<{
  clicked: [];
}>();

const onClick = () => emit('clicked');
</script>

<style>
.album-card {
  display: flex;
  gap: 16px;
  padding: 12px;
  background-color: #282828;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.album-card:hover {
  background-color: #333333;
  transform: translateX(4px);
}

.album-card.selected {
  background-color: #1db954;
}

.album-card.skeleton {
  height: 80px;
  background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 37%, #2a2a2a 63%);
  background-size: 400% 100%;
  animation: skeleton-shimmer 2.5s ease infinite;
}

.album-image {
  width: 64px;
  height: 64px;
  border-radius: 4px;
  object-fit: cover;
}

.album-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.album-name {
  font-family: "Montserrat", sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.album-card.selected .album-name {
  color: #000000;
}

.artist-names {
  font-family: "Montserrat", sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #b3b3b3;
}

.album-card.selected .artist-names {
  color: #121212;
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
