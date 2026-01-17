<template>
  <div class="flex flex-row gap-3 py-1">
    <UInput
      v-model="searchTerm"
      :icon="Icons.MAGNIFYING_GLASS"
      placeholder="Search albums or artists..."
      size="xl"
      class="flex-1"
    />
    <DropdownSelect v-model="sortBy" :options="sortOptions" label="Sort by" />
  </div>
</template>

<script setup lang="ts">
import { Icons } from '~/components/common/icons';
import type {
  SortOption,
  ViewMode,
} from '~/composables/components/useBacklogFilters';

const searchTerm = defineModel<string>('searchTerm', { required: true });
const sortBy = defineModel<SortOption>('sortBy', { required: true });

const props = defineProps<{
  viewMode: ViewMode;
}>();

const allSortOptions = [
  {
    value: [
      {
        value: 'date-added-desc' as SortOption,
        label: 'Newest First',
        icon: Icons.CALENDAR_ARROW_UP,
      },
      {
        value: 'date-added-asc' as SortOption,
        label: 'Oldest First',
        icon: Icons.CALENDAR_ARROW_DOWN,
      },
    ],
    modes: ['albums', 'artists'] as ViewMode[],
  },
  {
    value: [
      {
        value: 'name-asc' as SortOption,
        label: 'Album A → Z',
        icon: Icons.MUSICAL_NOTE,
      },
      {
        value: 'name-desc' as SortOption,
        label: 'Album Z → A',
        icon: Icons.MUSICAL_NOTE,
      },
    ],
    modes: ['albums'] as ViewMode[],
  },
  {
    value: [
      {
        value: 'artist-asc' as SortOption,
        label: 'Artist A → Z',
        icon: Icons.USER_UP,
      },
      {
        value: 'artist-desc' as SortOption,
        label: 'Artist Z → A',
        icon: Icons.USER_DOWN,
      },
    ],
    modes: ['albums', 'artists'] as ViewMode[],
  },
];

const sortOptions = computed(() =>
  allSortOptions
    .filter((option) => option.modes.includes(props.viewMode))
    .map(({ value }) => ({ value })),
);
</script>
