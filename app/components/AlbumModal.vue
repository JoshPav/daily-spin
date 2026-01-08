<template>
  <div v-if="isOpen" class="modal-backdrop" @click="handleBackdropClick">
    <div class="modal-content" @click.stop>
      <button class="close-button" @click="close">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>

      <div class="modal-body">
        <!-- Album artwork with same transition name -->
        <div
          class="modal-album-cover"
          :style="viewTransitionName
          ? { viewTransitionName }
          : undefined"
        >
          <NuxtImg
            v-if="album?.imageUrl"
            :src="album?.imageUrl"
            alt="Album cover"
            class="album-image"
          />
        </div>

        <!-- Album details -->
        <div v-if="album" class="album-details">
          <h2 class="album-title">{{ album.albumName }}</h2>
          <p class="artist-name">{{ album.artistNames }}</p>

          <div class="album-info">
            <div class="info-item">
              <span class="label">Release Date</span>
              <!-- <span class="value">{{ formatDate(album.release_date) }}</span> -->
            </div>
            <div class="info-item">
              <span class="label">Total Tracks</span>
              <!-- <span class="value">{{ album.total_tracks }}</span> -->
            </div>
            <div v-if="listenMetadata" class="info-item">
              <span class="label">Listened</span>
              <span class="value">{{ listenMetadata.inOrder ? 'In Order' : 'On Shuffle' }}</span>
            </div>
          </div>

          <!-- Track list -->
          <!-- <div v-if="album.tracks?.items" class="track-list">
            <h3 class="track-list-title">Tracks</h3>
            <div
              v-for="track in album.tracks.items"
              :key="track.id"
              class="track-item"
            >
              <span class="track-number">{{ track.track_number }}</span>
              <span class="track-name">{{ track.name }}</span>
              <span class="track-duration">{{ formatDuration(track.duration_ms) }}</span>
            </div>
          </div> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAlbumModal } from '~/composables/useAlbumModal';

const { isOpen, album, listenMetadata, viewTransitionName, close } =
  useAlbumModal();

const emit = defineEmits<{
  close: [];
}>();

const handleBackdropClick = () => {
  close();
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);

  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;

  z-index: 1000;
  overflow-y: auto;
}

.modal-content {
  position: relative;
  max-width: 900px;
  width: 100%;
  background-color: #181818;
  border-radius: 8px;
  padding: 32px;

  max-height: 90vh;
  overflow-y: auto;
}

.close-button {
  position: absolute;
  top: 16px;
  right: 16px;

  width: 40px;
  height: 40px;
  border-radius: 50%;

  background-color: rgba(0, 0, 0, 0.7);
  color: #b3b3b3;
  border: none;

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}

.close-button:hover {
  background-color: rgba(0, 0, 0, 0.9);
  color: #ffffff;
  transform: scale(1.1);
}

.modal-body {
  display: flex;
  gap: 32px;
}

.modal-album-cover {
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

.album-details {
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

.track-list-title {
  margin: 0 0 16px 0;
  font-family: 'Montserrat', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

.track-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.track-item {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  gap: 16px;
  align-items: center;

  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.track-item:hover {
  background-color: #282828;
}

.track-number {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #b3b3b3;
  text-align: right;
}

.track-name {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}

.track-duration {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #b3b3b3;
}

@media (max-width: 768px) {
  .modal-body {
    flex-direction: column;
  }

  .modal-album-cover {
    width: 100%;
    height: auto;
    aspect-ratio: 1;
  }
}
</style>
