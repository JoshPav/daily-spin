<template>
  <div class="flex flex-col gap-3">
    <!-- Artist Header -->
    <div class="flex items-center gap-3 px-3">
      <UAvatar
        :src="artistImage"
        :alt="artist.name"
        size="lg"
      />
      <div class="flex flex-col">
        <div class="text-lg font-bold text-white">
          <HighlightedText :text="artist.name" :search-term="searchTerm" />
        </div>
        <div class="text-sm text-muted">{{ albumCount }} {{ albumCount === 1 ? 'album' : 'albums' }}</div>
      </div>
    </div>

    <!-- Albums in this group -->
    <div class="flex flex-col gap-3 pl-4">
      <BacklogItem
        v-for="album in albums"
        :key="album.id"
        :album="album"
        :hide-artist="true"
        :search-term="searchTerm"
        @deleted="emit('deleted')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Artist, BacklogAlbum } from '#shared/schema';

const props = defineProps<{
  artist: Artist;
  albums: BacklogAlbum[];
  searchTerm?: string;
}>();

const emit = defineEmits<{
  deleted: [];
}>();

const albumCount = computed(() => props.albums.length);

// Get artist image from first album (Spotify doesn't provide artist images in simplified artist objects)
const artistImage = computed(() => {
  return props.artist.imageUrl || props.albums[0]?.imageUrl || undefined;
});
</script>
