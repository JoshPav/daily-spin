<script setup lang="ts">
import { Icons } from '~/components/common/icons';

const router = useRouter();

// Backlog actions (shared between tabs)
const {
  selectedAlbums,
  saving,
  isSelected,
  toggleSelection,
  clearSelection,
  addToBacklog,
} = useAddToBacklog({
  onSuccess: () => {
    router.back();
  },
});

// Tab state
type ViewMode = 'search' | 'releases';
const activeTab = ref<ViewMode>('search');
const tabItems = [
  {
    label: 'Search',
    icon: Icons.MAGNIFYING_GLASS,
    value: 'search' as ViewMode,
  },
  {
    label: 'Featured',
    icon: Icons.SPARKLES,
    value: 'releases' as ViewMode,
  },
];

const handleAdd = async () => {
  await addToBacklog();
};
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <main
      class="mx-auto flex w-full max-w-200 flex-1 flex-col overflow-hidden p-4 md:p-6"
    >
      <!-- Back button row -->
      <div class="mb-2 flex flex-row items-center justify-between">
        <UButton
          color="neutral"
          variant="ghost"
          :icon="Icons.BACK"
          aria-label="Go back"
          size="sm"
          @click="router.back()"
        >
          Back
        </UButton>

        <!-- Compact tabs -->
        <UTabs
          v-model="activeTab"
          :items="tabItems"
          size="sm"
          :ui="{
            trigger: 'w-28 justify-center',
          }"
        />
      </div>

      <!-- Header -->
      <h1 class="m-0 mb-4 text-2xl font-black text-highlighted md:text-[32px]">
        Add to Backlog
      </h1>

      <!-- Search tab content -->
      <AlbumSearchSelect
        v-if="activeTab === 'search'"
        :is-selected="isSelected"
        class="min-h-0 flex-1"
        @select="toggleSelection"
      />

      <!-- Featured tab content -->
      <FeaturedReleases
        v-else
        :is-selected="isSelected"
        class="min-h-0 flex-1"
        @select="toggleSelection"
      />

      <!-- Selected albums footer (shared between tabs) -->
      <SelectedAlbumsFooter
        :selected-albums="selectedAlbums"
        :saving="saving"
        @add="handleAdd"
        @clear="clearSelection"
      />
    </main>
  </div>
</template>
