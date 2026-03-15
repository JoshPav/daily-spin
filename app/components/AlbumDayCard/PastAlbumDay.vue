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
      <template #badge>
        <div
          v-if="hasNoSkip"
          class="absolute bottom-1 right-1 bg-green-500/90 text-white px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase z-10 pointer-events-none"
        >
          No Skip
        </div>
      </template>

      <template #empty>
        <div
          class="text-xs font-semibold tracking-wide text-neutral-500 uppercase"
        >
          <button
            v-if="isInLastWeek"
            data-testid="add-listen-button"
            class="flex items-center justify-center p-0 bg-transparent border-none cursor-pointer text-primary transition-all duration-200 hover:text-(--color-primary-vibrant) hover:scale-110 active:scale-105"
            @click.stop="openAddModal"
          >
            <UIcon :name="Icons.PLUS_CIRCLE" class="w-9 h-9" />
          </button>
          <UTooltip v-else text="No albums listened to this day">
            <span>—</span>
          </UTooltip>
        </div>
      </template>
    </AlbumDayCard>
  </UChip>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { LazyDailyListensModal, LazyLogAlbumModal } from '#components';
import type { DailyListens, FavoriteSong } from '#shared/schema';
import { Icons } from '~/components/common/icons';
import {
  getAlbumsSortedByFavorite,
  toAlbumCardInfo,
} from '~/utils/albums.utils';

const { date, listens, onFavoriteSongUpdate, onNoSkipUpdate, onAlbumLogged } =
  defineProps<{
    date: string;
    listens?: DailyListens;
    onFavoriteSongUpdate: (
      date: string,
      favoriteSong: FavoriteSong | null,
    ) => void;
    onNoSkipUpdate?: (
      date: string,
      spotifyAlbumId: string,
      noSkip: boolean,
    ) => void;
    onAlbumLogged?: () => void;
  }>();

const overlay = useOverlay();
const dailyListensModal = overlay.create(LazyDailyListensModal);
const addAlbumModal = overlay.create(LazyLogAlbumModal);

const {
  date: dateRef,
  relative: { isInLastWeek },
} = useDate(date);

const hasAlbums = computed(() => (listens?.albums.length ?? 0) > 0);
const needsFavoriteSong = computed(
  () => hasAlbums.value && !listens?.favoriteSong,
);
const hasNoSkip = computed(
  () => listens?.albums.some((a) => a.listenMetadata.noSkip) ?? false,
);

const albumCardInfo = computed(() => {
  if (!listens) return [];
  return getAlbumsSortedByFavorite(listens)
    .map(toAlbumCardInfo)
    .filter((info) => info !== null);
});

const openAddModal = () => {
  addAlbumModal.open({
    dateOfListen: dateRef.value,
    onAlbumLogged,
  });
};

const handleClick = () => {
  if (!listens || !hasAlbums.value) return;
  dailyListensModal.open({
    dailyListens: listens,
    onFavoriteSongUpdate,
    onNoSkipUpdate,
  });
};

// Sticky month header tracking
const cardRef = ref<{ cardEl: HTMLElement | null } | null>(null);
useMonthHeaderTracking(cardRef, dateRef);
</script>
