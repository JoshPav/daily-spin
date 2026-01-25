<template>
  <CollapsibleSection
    v-model="open"
    class="flex flex-col bg-elevated"
    variant="ghost"
    size="xl"
    button-class="justify-start hover:cursor-pointer"
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
      <!-- Scheduled indicator -->
      <UTooltip
        v-if="scheduledCount > 0"
        :text="`${scheduledCount} ${scheduledCount === 1 ? 'album' : 'albums'} scheduled`"
      >
        <div
          class="flex items-center justify-center w-8 h-8 rounded-md bg-indigo-500/20 text-indigo-400"
        >
          <UIcon :name="Icons.CALENDAR.DAYS" class="w-4 h-4" />
        </div>
      </UTooltip>
    </template>

    <!-- Albums in this group -->
    <div class="flex flex-col px-4">
      <template v-for="album in albums" :key="album.id">
        <USeparator />
        <BacklogItem
          :album="album"
          :scheduled-listen="scheduledBySpotifyId?.get(album.spotifyId) ?? null"
          :hide-artist="true"
          :search-term="searchTerm"
          @deleted="emit('deleted')"
          @schedule-changed="emit('scheduleChanged')"
        />
      </template>
    </div>
  </CollapsibleSection>
</template>

<script setup lang="ts">
import type { Artist, BacklogAlbum, ScheduledListenItem } from '#shared/schema';
import { Icons } from '~/components/common/icons';

const props = defineProps<{
  artist: Artist;
  albums: BacklogAlbum[];
  scheduledBySpotifyId?: Map<string, ScheduledListenItem>;
  searchTerm?: string;
}>();

const emit = defineEmits<{
  deleted: [];
  scheduleChanged: [];
}>();

const open = ref(false);
const albumCount = computed(() => props.albums.length);

// Count how many albums in this group are scheduled
const scheduledCount = computed(() => {
  if (!props.scheduledBySpotifyId) return 0;
  return props.albums.filter((album) =>
    props.scheduledBySpotifyId?.has(album.spotifyId),
  ).length;
});

// Get artist image from first album (Spotify doesn't provide artist images in simplified artist objects)
const artistImage = computed(() => {
  return props.artist.imageUrl || props.albums[0]?.imageUrl || undefined;
});
</script>
