<script setup lang="ts">
import type { SimplifiedAlbum } from '@spotify/web-api-ts-sdk';
import { Icons } from '~/components/common/icons';

const props = withDefaults(
  defineProps<{
    compact?: boolean;
    isSelected?: (album: SimplifiedAlbum) => boolean;
  }>(),
  {
    compact: false,
    isSelected: () => false,
  },
);

defineEmits<{
  select: [album: SimplifiedAlbum];
}>();

// Search composable
const { searchResults, loading, search, allowEPs } = useSpotifyAlbumSearch();

// Filter dropdown items
const filterItems = computed(() => [
  [
    {
      label: 'Include EPs',
      icon: Icons.EP,
      type: 'checkbox' as const,
      checked: allowEPs.value,
      onUpdateChecked: (checked: boolean) => {
        allowEPs.value = checked;
      },
    },
  ],
]);

// Search input
const searchInput = ref('');

const handleSearchInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  search(target.value);
};

// Computed classes based on compact mode
const inputSize = computed(() => (props.compact ? 'lg' : 'xl'));
const buttonSize = computed(() => (props.compact ? 'lg' : 'xl'));

const emptyText = computed(() =>
  searchInput.value
    ? 'No albums found'
    : 'Search for albums to add to your backlog',
);
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Search row -->
    <div class="mb-4 flex gap-3">
      <UInput
        v-model="searchInput"
        :icon="Icons.MAGNIFYING_GLASS"
        placeholder="Search albums or artists..."
        :size="inputSize"
        class="flex-1"
        autofocus
        @input="handleSearchInput"
      />
      <UDropdownMenu :items="filterItems">
        <UButton color="primary" variant="outline" :size="buttonSize">
          <UIcon :name="Icons.FILTER" class="text-lg" />
          <span v-if="!compact" class="hidden md:inline">Filters</span>
        </UButton>
      </UDropdownMenu>
    </div>

    <AlbumResultsList
      :albums="searchResults"
      :loading="loading"
      :is-selected="isSelected"
      :compact="compact"
      :empty-text="emptyText"
      @select="$emit('select', $event)"
    />
  </div>
</template>
