<template>
  <UChip
    size="3xl"
    :show="needsFavoriteSong"
    color="warning"
    :ui="{ base: 'z-20' }"
  >
    <AlbumDayCard
      ref="cardRef"
      :date="dayListens.date"
      :albums="albumCardInfo"
      :pending="pending"
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
import type { DailyListens } from '#shared/schema';
import type { AlbumCardInfo } from './AlbumDayCard.vue';

const { dayListens, pending = false } = defineProps<{
  dayListens: DailyListens;
  pending?: boolean;
}>();

const overlay = useOverlay();
const dailyListensModal = overlay.create(LazyDailyListensModal);

const { date } = useDate(dayListens.date);

const hasAlbums = computed(() => dayListens.albums.length > 0);
const needsFavoriteSong = computed(
  () => hasAlbums.value && !dayListens.favoriteSong,
);

const albumCardInfo = computed<AlbumCardInfo[]>(() =>
  dayListens.albums.map((a) => ({
    imageUrl: a.album.imageUrl,
    artistName: a.album.artists[0]?.name ?? 'Unknown Artist',
    albumName: a.album.albumName,
  })),
);

const handleClick = () => {
  if (!hasAlbums.value) return;
  dailyListensModal.open({ dailyListens: dayListens });
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
              setCurrentMonth(date.value);
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
