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
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { LazyDailyListensModal } from '#components';
import type { DailyListens, FavoriteSong } from '#shared/schema';
import type { AlbumCardInfo } from './AlbumDayCard.vue';

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

const albumCardInfo = computed<AlbumCardInfo[]>(
  () =>
    listens?.albums.map((a) => ({
      imageUrl: a.album.imageUrl,
      artistName: a.album.artists[0]?.name ?? 'Unknown Artist',
      albumName: a.album.albumName,
    })) ?? [],
);

const handleClick = () => {
  if (!listens || !hasAlbums.value) return;
  dailyListensModal.open({
    dailyListens: listens,
    onFavoriteSongUpdate,
  });
};

// Sticky month header tracking
const { setCurrentMonth } = useCurrentMonth();
const cardRef = ref<{ cardEl: HTMLElement | null } | null>(null);

onMounted(() => {
  watch(
    () => cardRef.value?.cardEl,
    (el) => {
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
              setCurrentMonth(dateRef.value);
            }
          });
        },
        {
          threshold: [0.3, 0.5, 0.7],
          rootMargin: '-40% 0px -40% 0px',
        },
      );

      observer.observe(el);

      onUnmounted(() => {
        observer.unobserve(el);
      });
    },
    { immediate: true },
  );
});
</script>
