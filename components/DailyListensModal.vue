<template>
  <Modal :isOpen="isOpen" @close="close" :title="modalHeader" :modalSubheading="modalSubheading">

    <template #body>
      <AlbumCarousel
        v-if="dailyListens"
        :albums="dailyListens.albums"
        :view-transition-name="viewTransitionName"
      />
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { formatDate } from '~/utils/dateUtils';

const { isOpen, dailyListens, viewTransitionName, close } =
  useDailyListensModal();

const emit = defineEmits<{
  close: [];
}>();

const modalHeader = computed(() =>
  dailyListens.value ? formatDate(new Date(dailyListens.value.date)) : '',
);

const modalSubheading = computed(() => {
  const albumCount = dailyListens.value?.albums.length;

  if (!albumCount || albumCount <= 1) {
    return undefined;
  }

  return `${albumCount} albums listened`;
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
