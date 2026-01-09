<template>
  <div v-if="isOpen" class="modal-backdrop" @click="handleBackdropClick">
    <div class="modal-content" @click.stop>
      <button class="close-button" @click="close">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>

      <!-- Date header -->
      <div v-if="dailyListens" class="modal-header">
        <h1 class="date-title">{{ formatDate(dailyListens.date) }}</h1>
        <p v-if="dailyListens.albums.length > 1" class="album-count-text">
          {{ dailyListens.albums.length }} albums listened
        </p>
      </div>

      <!-- Albums carousel -->
      <AlbumCarousel
        v-if="dailyListens"
        :albums="dailyListens.albums"
        :view-transition-name="viewTransitionName"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, watch } from 'vue';

const { isOpen, dailyListens, viewTransitionName, close } =
  useDailyListensModal();

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

// Escape key handler
const handleEscapeKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isOpen.value) {
    close();
  }
};

// Add/remove event listener when modal opens/closes
watch(isOpen, (newValue) => {
  if (newValue) {
    window.addEventListener('keydown', handleEscapeKey);
  } else {
    window.removeEventListener('keydown', handleEscapeKey);
  }
});

// Cleanup on unmount
onUnmounted(() => {
  window.removeEventListener('keydown', handleEscapeKey);
});
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

.modal-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #282828;
}

.date-title {
  margin: 0 0 8px 0;
  font-family: 'Montserrat', sans-serif;
  font-size: 36px;
  font-weight: 900;
  color: #1db954;
  letter-spacing: -0.02em;
}

.album-count-text {
  margin: 0;
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #b3b3b3;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

@media (max-width: 768px) {
  .date-title {
    font-size: 28px;
  }
}
</style>
