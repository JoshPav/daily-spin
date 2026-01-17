<template>
  <AlbumDayCard
    ref="cardRef"
    :date="date"
    :albums="albumCardInfo"
    :pending="pending"
    @click="handleClick"
  >
    <template #badge>
      <div
        v-if="futureAlbum"
        class="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-md bg-indigo-500/90 text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)] z-10 pointer-events-none"
      >
        <UIcon name="i-lucide-calendar-days" class="w-4 h-4" />
      </div>
    </template>
  </AlbumDayCard>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { LazyFutureListenModal } from '#components';
import type { FutureListenItem } from '#shared/schema';
import type { AlbumCardInfo } from './AlbumDayCard.vue';

const {
  date,
  futureAlbum,
  pending = false,
} = defineProps<{
  date: string;
  futureAlbum?: FutureListenItem;
  pending?: boolean;
}>();

const overlay = useOverlay();
const futureListenModal = overlay.create(LazyFutureListenModal);

const { date: dateRef } = useDate(date);

const albumCardInfo = computed<AlbumCardInfo[]>(() => {
  if (!futureAlbum) return [];
  return [
    {
      imageUrl: futureAlbum.album.imageUrl,
      artistName: futureAlbum.album.artists[0]?.name ?? 'Unknown Artist',
      albumName: futureAlbum.album.name,
    },
  ];
});

const handleClick = () => {
  if (!futureAlbum) return;
  futureListenModal.open({ futureListenItem: futureAlbum });
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
