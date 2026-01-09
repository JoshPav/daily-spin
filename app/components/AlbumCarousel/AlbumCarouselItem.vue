<template>
  <div class="carousel-item">
    <div class="carousel-album-cover">
      <NuxtImg
        v-if="albumListen.album.imageUrl"
        :src="albumListen.album.imageUrl"
        :alt="`${albumListen.album.albumName} cover`"
        class="album-image"
      />
    </div>

    <div class="carousel-album-details">
      <h2 class="album-title">{{ albumListen.album.albumName }}</h2>
      <p class="artist-name">{{ albumListen.album.artistNames }}</p>

      <div class="album-info">
        <div class="info-item">
          <span class="label">Listened</span>
          <span class="value">
            {{ albumListen.listenMetadata.inOrder ? 'In Order' : 'On Shuffle' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DailyAlbumListen } from '#shared/schema';

defineProps<{
  albumListen: DailyAlbumListen;
}>();
</script>

<style scoped>
.carousel-item {
  display: flex;
  gap: 32px;
  width: 100%;
}

.carousel-album-cover {
  flex-shrink: 0;
  width: 300px;
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
  background-color: #121212;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.album-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.carousel-album-details {
  flex: 1;
  min-width: 0;
}

.album-title {
  margin: 0 0 8px 0;
  font-family: 'Montserrat', sans-serif;
  font-size: 32px;
  font-weight: 900;
  color: #ffffff;
  line-height: 1.2;
}

.artist-name {
  margin: 0 0 24px 0;
  font-family: 'Montserrat', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #b3b3b3;
}

.album-info {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #282828;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-family: 'Montserrat', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #b3b3b3;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.value {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}

@media (max-width: 768px) {
  .carousel-item {
    flex-direction: column;
  }

  .carousel-album-cover {
    width: 100%;
    height: auto;
    aspect-ratio: 1;
  }

  .album-title {
    font-size: 24px;
  }
}
</style>
