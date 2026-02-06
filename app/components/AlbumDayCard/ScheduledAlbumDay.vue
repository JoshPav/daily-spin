<template>
  <AlbumDayCard
    data-testid="scheduled-album-day"
    ref="cardRef"
    :date="date"
    :albums="albumCardInfo"
    :pending="pending"
    @click="handleClick"
  >
    <template #badge>
      <div
        v-if="scheduledListen"
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
          v-if="isInLastWeek"
          data-testid="add-listen-button"
          class="flex items-center justify-center p-0 bg-transparent border-none cursor-pointer text-primary transition-all duration-200 hover:text-(--color-primary-vibrant) hover:scale-110 active:scale-105"
          @click.stop="openAddModal"
        >
          <UIcon :name="Icons.PLUS_CIRCLE" class="w-9 h-9" />
        </button>
        <span v-else>—</span>
      </div>
    </template>
  </AlbumDayCard>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { LazyLogAlbumModal, LazyScheduledListenModal } from '#components';
import type { ScheduledListenItem } from '#shared/schema';
import { Icons } from '~/components/common/icons';
import { scheduledAlbumToCardInfo } from '~/utils/albums.utils';

const {
  date,
  scheduledListen,
  pending = false,
} = defineProps<{
  date: string;
  scheduledListen?: ScheduledListenItem;
  pending?: boolean;
}>();

const overlay = useOverlay();
const scheduledListenModal = overlay.create(LazyScheduledListenModal);
const addAlbumModal = overlay.create(LazyLogAlbumModal);

const {
  date: dateRef,
  relative: { isInLastWeek },
} = useDate(date);

const openAddModal = () => {
  addAlbumModal.open({ dateOfListen: dateRef.value });
};

const albumCardInfo = computed(() => {
  const info = scheduledAlbumToCardInfo(scheduledListen?.album ?? null);
  return info ? [info] : [];
});

const handleClick = () => {
  if (!scheduledListen) return;
  scheduledListenModal.open({ scheduledListenItem: scheduledListen });
};

// Sticky month header tracking
const cardRef = ref<{ cardEl: HTMLElement | null } | null>(null);
useMonthHeaderTracking(cardRef, dateRef);
</script>
