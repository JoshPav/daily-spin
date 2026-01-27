<template>
  <UChip
    data-testid="past-album-day"
    size="3xl"
    :show="needsFavoriteSong"
    color="warning"
    :ui="{ base: 'z-20' }"
  >
    <AlbumDayCard
      ref="cardRef"
      :date="date"
      :albums="albumCardInfo"
      :pending="!listens"
      @click="handleClick"
    >
      <template #empty>
        <div
          class="text-xs font-semibold tracking-wide text-neutral-500 uppercase"
        >
          <UTooltip text="No albums listened to this day">
            <span>—</span>
          </UTooltip>
        </div>
      </template>
    </AlbumDayCard>
  </UChip>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { LazyDailyListensModal } from '#components';
import type { DailyListens, FavoriteSong } from '#shared/schema';
import {
  getAlbumsSortedByFavorite,
  toAlbumCardInfo,
} from '~/utils/albums.utils';

const { date, listens, onFavoriteSongUpdate } = defineProps<{
  date: string;
  listens?: DailyListens;
  onFavoriteSongUpdate: (
    date: string,
    favoriteSong: FavoriteSong | null,
  ) => void;
}>();

const overlay = useOverlay();
const dailyListensModal = overlay.create(LazyDailyListensModal);

const { date: dateRef } = useDate(date);

const hasAlbums = computed(() => (listens?.albums.length ?? 0) > 0);
const needsFavoriteSong = computed(
  () => hasAlbums.value && !listens?.favoriteSong,
);

const albumCardInfo = computed(() => {
  if (!listens) return [];
  return getAlbumsSortedByFavorite(listens)
    .map(toAlbumCardInfo)
    .filter((info) => info !== null);
});

const handleClick = () => {
  if (!listens || !hasAlbums.value) return;
  dailyListensModal.open({
    dailyListens: listens,
    onFavoriteSongUpdate,
  });
};

// Sticky month header tracking
const cardRef = ref<{ cardEl: HTMLElement | null } | null>(null);
useMonthHeaderTracking(cardRef, dateRef);
</script>
