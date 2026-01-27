<template>
  <div
    ref="cardEl"
    class="album-day-card relative w-full aspect-square rounded-lg bg-default transition-[transform,box-shadow] duration-150 ease-out"
    :class="{
      today: isToday && props.highlightToday,
      'full-color': props.fullColor,
      'non-interactive': !props.interactive,
      'opacity-30': isFuture && !props.selectable,
      'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)]':
        props.interactive && (clickable || props.selectable),
    }"
    @click="$emit('click')"
  >
    <div
      v-if="day === 1 && props.showMonthHeader"
      data-testid="month-label"
      class="absolute -top-8 left-0 right-0 py-1.5 px-3 bg-black/85 text-primary text-sm font-bold tracking-widest text-center z-3 pointer-events-none rounded-t"
    >
      {{ formattedMonth }}
    </div>

    <!-- Day number overlay -->
    <div
      data-testid="day-number"
      class="absolute rounded-md bg-black/60 text-white font-black leading-none z-5 pointer-events-none [text-shadow:0_2px_4px_rgba(0,0,0,0.7)] [font-feature-settings:'tnum'_1,'zero'_1] tracking-tight"
      :class="dayNumberClasses"
    >
      {{ day }}
    </div>

    <!-- Album count badge -->
    <div
      v-if="albumCount > 1"
      data-testid="album-count-badge"
      class="absolute top-2 left-2 flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(29,185,84,0.95)] text-white text-sm font-bold shadow-[0_2px_8px_rgba(0,0,0,0.4)] z-10 pointer-events-none"
    >
      {{ albumCount }}
    </div>

    <!-- Custom badge slot (for scheduled badge, etc.) -->
    <slot name="badge" />

    <!-- Loading state -->
    <USkeleton v-if="pending" class="absolute inset-0 rounded-lg" />

    <!-- Album images (stacked, empty, or no-artwork) -->
    <AlbumImageStack
      v-else
      :images="images"
      :is-future="isFuture"
      :first-album="firstAlbum"
    >
      <template #empty>
        <slot name="empty" />
      </template>
      <template #no-artwork>
        <slot name="no-artwork" />
      </template>
    </AlbumImageStack>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { AlbumCardInfo, AlbumCardSize } from './AlbumDayCard.types';

export type { AlbumCardInfo, AlbumCardSize } from './AlbumDayCard.types';

const props = withDefaults(
  defineProps<{
    date: string;
    albums: AlbumCardInfo[];
    pending?: boolean;
    /** When true, future days won't be dimmed (useful for date pickers) */
    selectable?: boolean;
    /** Size variant for the card */
    size?: AlbumCardSize;
    /** When true, shows month header above day 1 of each month */
    showMonthHeader?: boolean;
    /** When true, shows green glow highlight for today */
    highlightToday?: boolean;
    /** When true, shows album art in full color (no grayscale filter) */
    fullColor?: boolean;
    /** When true, enables hover effects and click interactions */
    interactive?: boolean;
  }>(),
  {
    size: 'md',
    showMonthHeader: true,
    highlightToday: true,
    fullColor: false,
    interactive: true,
  },
);

defineEmits<{
  click: [];
}>();

const cardEl = ref<HTMLElement | null>(null);

const {
  day,
  formatted: { formattedMonth },
  relative: { isFuture, isToday },
} = useDate(props.date);

// Size-based classes for day number overlay
const dayNumberClasses = computed(() => {
  const sizeClasses: Record<AlbumCardSize, string> = {
    xs: 'bottom-0.5 left-0.5 py-0.5 px-1 min-w-4 text-[10px]',
    sm: 'bottom-1 left-1 py-0.5 px-1.5 min-w-6 text-sm',
    md: 'bottom-2 left-2 py-1.5 px-2.5 min-w-12 text-2xl',
    lg: 'bottom-2.5 left-2.5 py-2 px-3 min-w-14 text-3xl',
    xl: 'bottom-3 left-3 py-2.5 px-4 min-w-16 text-4xl',
  };
  return sizeClasses[props.size];
});

const albumCount = computed(() => props.albums.length);

const clickable = computed(() => !!albumCount.value);
const images = computed(() => props.albums?.map((a) => a.imageUrl) ?? []);

const firstAlbum = computed(() => props.albums[0] ?? null);

// Expose the card element for parent components (e.g., intersection observer)
defineExpose({
  cardEl,
});
</script>

<style>
/* Today's card glow */
.album-day-card.today {
  box-shadow: 0 0 24px rgba(29, 185, 84, 0.4);
}
</style>
