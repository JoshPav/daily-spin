<template>
  <div :class="gridClasses">
    <AlbumDayCard
      v-for="dayData in days"
      :key="dayData.day"
      :date="dayData.date"
      :albums="getAlbumCardInfo(dayData.album)"
      :size="size"
      :show-month-header="false"
      :highlight-today="false"
      :interactive="false"
      full-color
    />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { AlbumCardSize } from '~/components/AlbumDayCard/AlbumDayCard.types';
import type { DayAlbum } from '~/composables/api/listens/useMonthlyListens';
import { toAlbumCardInfo } from '~/utils/albums.utils';

const props = withDefaults(
  defineProps<{
    days: DayAlbum[];
    /** Number of columns in the grid */
    columns?: number;
    /** Size of the album cards */
    size?: AlbumCardSize;
  }>(),
  {
    columns: 5,
    size: 'md',
  },
);

// Wrap utility for template use (returns array for AlbumDayCard)
const getAlbumCardInfo = (album: DayAlbum['album']) => {
  const info = toAlbumCardInfo(album);
  return info ? [info] : [];
};

// Dynamic grid classes based on columns prop
const gridClasses = computed(() => {
  const colClasses: Record<number, string> = {
    4: 'grid grid-cols-4 gap-2',
    5: 'grid grid-cols-5 gap-2',
    6: 'grid grid-cols-6 gap-2',
    7: 'grid grid-cols-7 gap-2',
  };
  return colClasses[props.columns] ?? 'grid grid-cols-5 gap-2';
});
</script>
