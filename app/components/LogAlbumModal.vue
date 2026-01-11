<template>
   <Modal :isOpen="isOpen" @close="close" title="Log Album" :modal-subheading="subheadingText">
    <template #body>
      <div class="modal-body">
        <AlbumSearch v-if="!selectedAlbum" v-model="selectedAlbum" />

        <div v-if="selectedAlbum" class="selected-album-section">
          <div class="section-header">
            <h3 class="section-title">Selected Album</h3>
            <Button variant="secondary" @click="selectedAlbum = undefined">Change</Button>
          </div>

          <AlbumPreview  :album="selectedAlbum" />

          <RadioSelect label="Listen Method" :options="radioOptions" v-model="listenMethod" />

          <Button variant="primary" @click="logAlbumListen" :loading="saving">
            Save Listen
          </Button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script lang="ts" setup>
import { formatDate } from '~/utils/dateUtils';
import type { RadioOption } from './common/RadioSelect.vue';
import SpotifyIcon from './common/Icons/SpotifyIcon.vue';
import StreamIcon from './common/Icons/StreamIcon.vue';
import VinylIcon from './common/Icons/VinylIcon.vue';
import type { ListenMethod } from '#shared/schema';

const { close, dateOfListen, isOpen } = useAddAlbumListenModal();

const { selectedAlbum, listenMethod, saving, logAlbumListen } = useLogAlbum({
  date: dateOfListen,
  onSuccess: close,
});

const radioOptions: RadioOption<ListenMethod>[] = [
  {
    text: 'Spotify',
    value: 'spotify',
    icon: SpotifyIcon,
  },
  {
    text: 'Vinyl',
    value: 'vinyl',
    icon: VinylIcon,
  },
  {
    text: 'Streamed',
    value: 'streamed',
    icon: StreamIcon,
  },
];

const subheadingText = computed(() => {
  return formatDate(dateOfListen.value || new Date());
});
</script>

<style scoped>
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.selected-album-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  margin: 0;
  font-family: 'Montserrat', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #1db954;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
}
</style>