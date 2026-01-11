<template>
  <div class="selected-album-preview">
    <img
      v-if="album.images?.[0]?.url"
      :src="album.images[0].url"
      :alt="album.name"
      class="preview-image"
    />
    <div class="preview-info">
      <div class="preview-album-name">{{ album.name }}</div>
      <div class="preview-artist-names">
        {{ getAlbumArtists(album.artists) }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{ album: SearchResult }>();
</script>

<style>

.selected-album-preview {
  display: flex;
  gap: 16px;
  align-items: center;
}

.preview-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
}

.preview-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-album-name {
  font-family: 'Montserrat', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

.preview-artist-names {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #b3b3b3;
}

</style>