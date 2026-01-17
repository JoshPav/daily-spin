<template>
  <UModal
    title="Add to Backlog"
    description="Search for albums to add to your backlog"
    :content="{ onOpenAutoFocus: (e) => e.preventDefault() }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <input
            v-model="searchInput"
            type="text"
            placeholder="Search by name or artist..."
            class="w-full px-4 py-3 bg-elevated border-2 border-neutral-600 rounded-lg text-white font-montserrat text-base transition-colors focus:outline-none focus:border-primary-500 placeholder:text-muted"
            @input="handleSearchInput"
          >
        </div>

        <div
          v-if="loading"
          class="flex flex-col gap-3 max-h-75 overflow-y-auto overflow-x-hidden"
        >
          <div
            v-for="i in 3"
            :key="i"
            class="h-20 rounded-lg bg-linear-to-r from-neutral-700 via-neutral-600 to-neutral-700 bg-[length:400%_100%] animate-[skeleton-shimmer_2.5s_ease_infinite]"
          ></div>
        </div>

        <!-- Search results with multi-select -->
        <div
          v-else-if="searchResults.length > 0"
          class="flex flex-col gap-3 max-h-75 overflow-y-auto overflow-x-hidden"
        >
          <div
            v-for="album in searchResults"
            :key="album.id"
            class="flex gap-3 p-3 rounded-lg cursor-pointer transition-all items-center"
            :class="
              isSelected(album)
                ? 'bg-primary-500'
                : 'bg-elevated hover:bg-muted'
            "
            @click="toggleSelection(album)"
          >
            <div class="flex-shrink-0">
              <UIcon
                v-if="isSelected(album)"
                :name="Icons.CHECK_CIRCLE_SOLID"
                class="text-xl"
              />
              <UIcon
                v-else
                :name="Icons.PLUS_CIRCLE"
                class="text-xl text-neutral-500"
              />
            </div>
            <img
              v-if="album.images?.[0]?.url"
              :src="album.images[0].url"
              :alt="album.name"
              class="w-14 h-14 rounded object-cover shrink-0"
            >
            <div class="flex-1 flex flex-col gap-1 min-w-0">
              <div
                class="font-montserrat text-[15px] font-bold whitespace-nowrap overflow-hidden text-ellipsis"
                :class="isSelected(album) ? 'text-black' : 'text-white'"
              >
                {{ album.name }}
              </div>
              <div
                class="font-montserrat text-[13px] font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                :class="isSelected(album) ? 'text-gray-900' : 'text-muted'"
              >
                {{ getArtistNames(album) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Selected albums summary -->
        <div
          v-if="selectedAlbums.length > 0"
          class="flex justify-between items-center px-3 py-2 bg-neutral-800 rounded-lg"
        >
          <div class="font-montserrat text-sm font-semibold text-primary-500">
            {{ selectedAlbums.length }} album
            {{ selectedAlbums.length === 1 ? '' : 's' }}
            selected
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            @click="clearSelection"
          >
            Clear
          </UButton>
        </div>

        <UButton
          v-if="selectedAlbums.length > 0"
          block
          color="primary"
          size="lg"
          :loading="saving"
          @click="handleAdd"
        >
          Add {{ selectedAlbums.length }} Album
          {{ selectedAlbums.length === 1 ? '' : 's' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script lang="ts" setup>
import { Icons } from '~/components/common/icons';
import type { SearchResult } from '~/composables/api/useSpotifyAlbumSearch';

const props = defineProps<{
  onAdded?: () => void;
}>();

const emit = defineEmits<{
  close: [];
  added: [];
}>();

const { searchResults, loading, search } = useSpotifyAlbumSearch();
const {
  selectedAlbums,
  saving,
  isSelected,
  toggleSelection,
  clearSelection,
  addToBacklog,
} = useAddToBacklog({
  onSuccess: () => {
    props.onAdded?.();
    emit('added');
    emit('close');
  },
});

const searchInput = ref('');

const handleSearchInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  search(target.value);
};

const getArtistNames = (album: SearchResult) =>
  album.artists.map((a) => a.name).join(', ');

const handleAdd = async () => {
  await addToBacklog();
};
</script>

<style scoped>
@keyframes skeleton-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
</style>
