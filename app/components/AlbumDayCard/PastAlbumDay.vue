<template>
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
        <button
          v-if="isToday"
          class="flex items-center justify-center p-0 bg-transparent border-none cursor-pointer text-primary transition-all duration-200 hover:text-[#1ed760] hover:scale-110 active:scale-105"
          @click.stop="openAddModal"
        >
          <PlusCircleIcon class="w-9 h-9" />
        </button>
        <UTooltip v-else text="No albums listened to this day">
          <span>—</span>
        </UTooltip>
      </div>
    </template>
  </AlbumDayCard>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { LazyDailyListensModal, LazyLogAlbumModal } from '#components';
import type { DailyListens } from '#shared/schema';
import type { AlbumCardInfo } from './AlbumDayCard.vue';

const { dayListens, pending = false } = defineProps<{
  dayListens: DailyListens;
  pending?: boolean;
}>();

const overlay = useOverlay();
const dailyListensModal = overlay.create(LazyDailyListensModal);
const addAlbumModal = overlay.create(LazyLogAlbumModal);

const {
  date,
  relative: { isToday },
} = useDate(dayListens.date);

const hasAlbums = computed(() => dayListens.albums.length > 0);

const albumCardInfo = computed<AlbumCardInfo[]>(() =>
  dayListens.albums.map((a) => ({
    imageUrl: a.album.imageUrl,
    artistName: a.album.artists[0]?.name ?? 'Unknown Artist',
    albumName: a.album.albumName,
  })),
);

const openAddModal = () => {
  addAlbumModal.open({ dateOfListen: date.value });
};

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
