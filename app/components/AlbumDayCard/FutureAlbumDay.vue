<template>
  <AlbumDayCard
    data-testid="future-album-day"
    ref="cardRef"
    :date="date"
    :albums="albumCardInfo"
    :pending="pending"
    @click="handleClick"
  >
    <template #badge>
      <div
        v-if="futureListen"
        class="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-md bg-indigo-500/90 text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)] z-10 pointer-events-none"
      >
        <UIcon name="i-lucide-calendar-days" class="w-4 h-4" />
      </div>
    </template>

    <template #empty>
      <div
        class="text-xs font-semibold tracking-wide text-neutral-500 uppercase"
      >
        <button
          v-if="isToday"
          data-testid="add-listen-button"
          class="flex items-center justify-center p-0 bg-transparent border-none cursor-pointer text-primary transition-all duration-200 hover:text-[#1ed760] hover:scale-110 active:scale-105"
          @click.stop="openAddModal"
        >
          <PlusCircleIcon class="w-9 h-9" />
        </button>
        <span v-else>—</span>
      </div>
    </template>
  </AlbumDayCard>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { LazyFutureListenModal, LazyLogAlbumModal } from '#components';
import type { FutureListenItem } from '#shared/schema';
import type { AlbumCardInfo } from './AlbumDayCard.vue';

const {
  date,
  futureListen,
  pending = false,
} = defineProps<{
  date: string;
  futureListen?: FutureListenItem;
  pending?: boolean;
}>();

const overlay = useOverlay();
const futureListenModal = overlay.create(LazyFutureListenModal);
const addAlbumModal = overlay.create(LazyLogAlbumModal);

const {
  date: dateRef,
  relative: { isToday },
} = useDate(date);

const openAddModal = () => {
  addAlbumModal.open({ dateOfListen: dateRef.value });
};

const albumCardInfo = computed<AlbumCardInfo[]>(() => {
  if (!futureListen) return [];
  return [
    {
      imageUrl: futureListen.album.imageUrl,
      artistName: futureListen.album.artists[0]?.name ?? 'Unknown Artist',
      albumName: futureListen.album.name,
    },
  ];
});

const handleClick = () => {
  if (!futureListen) return;
  futureListenModal.open({ futureListenItem: futureListen });
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
