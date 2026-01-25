<script setup lang="ts">
import { addDays, startOfDay } from 'date-fns';
import type { ScheduledListenItem } from '#shared/schema';
import { Icons } from '~/components/common/icons';
import { toDateKey } from '~/utils/dateUtils';

const { data, pending, error, refresh } = useBacklog();

// Fetch scheduled listens to show which backlog items are already scheduled
const scheduledBySpotifyId = ref<Map<string, ScheduledListenItem>>(new Map());

const fetchScheduledListens = async () => {
  try {
    const today = startOfDay(new Date());
    const endDate = addDays(today, 30); // Look ahead 30 days

    const response = await $fetch<{
      items: Record<string, ScheduledListenItem | null>;
    }>('/api/listens/scheduled', {
      query: {
        startDate: toDateKey(today),
        endDate: toDateKey(endDate),
      },
    });

    const newMap = new Map<string, ScheduledListenItem>();
    for (const [, item] of Object.entries(response.items)) {
      if (item !== null) {
        newMap.set(item.album.spotifyId, item);
      }
    }
    scheduledBySpotifyId.value = newMap;
  } catch {
    // Silently fail - scheduled status is a nice-to-have
  }
};

// Fetch on mount
onMounted(() => {
  fetchScheduledListens();
});

const getScheduledListen = (spotifyId: string) => {
  return scheduledBySpotifyId.value.get(spotifyId) ?? null;
};

const handleDeleted = () => {
  refresh();
};

const handleScheduleChanged = () => {
  fetchScheduledListens();
};

const albums = computed(() => data.value?.albums ?? []);

// Filtering
const { searchTerm, sortBy, viewMode, filteredAlbums, groupedByArtist } =
  useBacklogFilters(albums);

const viewModeOptions = [
  { value: 'albums', label: 'Albums', icon: Icons.MUSIC.ALBUMS },
  {
    value: 'artists',
    label: 'Artists',
    icon: Icons.MUSIC.ARTIST,
  },
];
</script>

<template>
  <div class="flex flex-col overflow-hidden h-full">
    <main
      class="max-w-200 mx-auto p-4 md:p-6 w-full flex-1 flex flex-col overflow-hidden"
    >
      <div
        class="flex flex-row justify-between items-stretch md:items-center gap-4 mb-6"
      >
        <h1 class="m-0 text-2xl md:text-[32px] font-black text-highlighted">
          Backlog
        </h1>
        <div class="flex flex-row gap-3 items-stretch md:items-center">
          <DropdownSelect
            v-model="viewMode"
            :options="viewModeOptions"
            label="Select view"
            icon-only
          />
          <UButton color="primary" :icon="Icons.PLUS" to="/backlog/add">
            Add Album
          </UButton>
        </div>
      </div>

      <div
        v-if="error"
        class="text-center py-12 px-6 text-base font-medium text-secondary-500"
      >
        Error: {{ error }}
      </div>

      <BacklogEmpty v-else-if="!pending && albums.length === 0" />

      <div v-else class="flex flex-col gap-4 overflow-hidden flex-1">
        <BacklogFilters
          v-model:search-term="searchTerm"
          v-model:sort-by="sortBy"
          :view-mode="viewMode"
          :disabled="pending"
        />

        <!-- Loading skeleton -->
        <div v-if="pending" class="flex flex-col gap-3 overflow-y-auto flex-1">
          <BacklogArtistGroupSkeleton v-for="i in 8" :key="i" />
        </div>

        <div
          v-else-if="filteredAlbums.length === 0"
          class="text-center py-12 text-base font-medium text-muted"
        >
          No albums found matching your search
        </div>

        <div v-else class="flex flex-col gap-2 overflow-y-auto flex-1">
          <template v-if="viewMode === 'albums'">
            <BacklogItem
              v-for="album in filteredAlbums"
              :key="album.id"
              :album="album"
              :scheduled-listen="getScheduledListen(album.spotifyId)"
              :search-term="searchTerm"
              @deleted="handleDeleted"
              @schedule-changed="handleScheduleChanged"
            />
          </template>

          <template v-else>
            <BacklogArtistGroup
              v-for="[artistKey, group] in groupedByArtist"
              :key="artistKey"
              :artist="group.artist"
              :albums="group.albums"
              :scheduled-by-spotify-id="scheduledBySpotifyId"
              :search-term="searchTerm"
              @deleted="handleDeleted"
              @schedule-changed="handleScheduleChanged"
            />
          </template>
        </div>
      </div>
    </main>
  </div>
</template>
