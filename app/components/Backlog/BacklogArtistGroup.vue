<template>
  <CollapsibleSection
    v-model="open"
    class="flex flex-col bg-elevated"
    variant="ghost"
    size="xl"
    button-class="justify-star hover:cursor-pointer"
  >
    <template #trigger>
      <div class="flex items-center gap-3 flex-1">
        <UAvatar :src="artistImage" :alt="artist.name" size="lg" />
        <div class="flex flex-col items-start">
          <div class="text-lg font-bold text-white">
            <HighlightedText :text="artist.name" :search-term="searchTerm" />
          </div>
          <div class="text-sm text-muted">
            {{ albumCount }}
            {{ albumCount === 1 ? 'album' : 'albums' }}
          </div>
        </div>
      </div>
    </template>

    <!-- Albums in this group -->
    <div class="flex flex-col px-4">
      <template v-for="album in albums" :key="album.id">
        <USeparator />
        <BacklogItem
          :album="album"
          :hide-artist="true"
          :search-term="searchTerm"
          @deleted="emit('deleted')"
        />
      </template>
    </div>
  </CollapsibleSection>
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

const open = ref(false);
const albumCount = computed(() => props.albums.length);

// Get artist image from first album (Spotify doesn't provide artist images in simplified artist objects)
const artistImage = computed(() => {
  return props.artist.imageUrl || props.albums[0]?.imageUrl || undefined;
});
</script>
