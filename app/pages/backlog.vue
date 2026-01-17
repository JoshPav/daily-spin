<script setup lang="ts">
import { LazyAddToBacklogModal } from '#components';
import { Icons } from '~/components/common/icons';

const { data, pending, error, refresh } = useBacklog();

const handleAdded = () => {
  refresh();
};

const handleDeleted = () => {
  refresh();
};

const overlay = useOverlay();
const modal = overlay.create(LazyAddToBacklogModal);

const openAddModal = () => {
  modal.open({
    onAdded: handleAdded,
  });
};

const albums = computed(() => data.value?.albums ?? []);

// Filtering
const { searchTerm, sortBy, viewMode, filteredAlbums, groupedByArtist } =
  useBacklogFilters(albums);

const viewModeOptions = [
  { value: 'albums', label: 'Albums', icon: Icons.ALBUM_LIST },
  {
    value: 'artists',
    label: 'Artists',
    icon: Icons.ARTIST,
  },
];
</script>

<template>
  <div class="flex flex-col overflow-hidden h-full">
    <main class="max-w-200 mx-auto p-4 md:p-6 w-full flex-1 flex flex-col overflow-hidden">
      <div class="flex flex-row justify-between items-stretch md:items-center gap-4 mb-6">
        <h1 class="m-0 text-2xl md:text-[32px] font-black text-highlighted">Backlog</h1>
        <div class="flex flex-row gap-3 items-stretch md:items-center">
          <DropdownSelect
            v-model="viewMode"
            :options="viewModeOptions"
            label="Select view"
            icon-only
          />
          <UButton
            color="primary"
            :icon="Icons.PLUS"
            @click="openAddModal"
          >
            Add Album
          </UButton>
        </div>
      </div>

      <div v-if="pending" class="text-center py-12 px-6 text-base font-medium text-muted">Loading...</div>

      <div v-else-if="error" class="text-center py-12 px-6 text-base font-medium text-secondary-500">Error: {{ error }}</div>

      <BacklogEmpty v-else-if="albums.length === 0" :on-added="handleAdded" />

      <div v-else class="flex flex-col gap-4 overflow-hidden flex-1">
        <BacklogFilters
          v-model:search-term="searchTerm"
          v-model:sort-by="sortBy"
          :view-mode="viewMode"
        />

        <div v-if="filteredAlbums.length === 0" class="text-center py-12 text-base font-medium text-muted">
          No albums found matching your search
        </div>

        <!-- Album List View -->
        <div v-else-if="viewMode === 'albums'" class="flex flex-col gap-3 overflow-y-auto flex-1">
          <BacklogItem
            v-for="album in filteredAlbums"
            :key="album.id"
            :album="album"
            :search-term="searchTerm"
            @deleted="handleDeleted"
          />
        </div>

        <!-- Artist Grouped View -->
        <div v-else class="flex flex-col gap-6 overflow-y-auto flex-1">
          <BacklogArtistGroup
            v-for="[artistKey, group] in groupedByArtist"
            :key="artistKey"
            :artist="group.artist"
            :albums="group.albums"
            :search-term="searchTerm"
            @deleted="handleDeleted"
          />
        </div>
      </div>
    </main>
  </div>
</template>
