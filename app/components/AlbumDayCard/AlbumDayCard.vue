<template>
  <div
    ref="cardEl"
    class="album-day-card relative w-full aspect-square rounded-lg bg-default transition-[transform,box-shadow] duration-150 ease-out"
    :class="{
      'today': isToday,
      'opacity-30': isFuture && !props.selectable,
      'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)]': clickable || props.selectable,
    }"
    @click="$emit('click')"
  >
    <div
      v-if="day === 1"
      data-testid="month-label"
      class="absolute -top-8 left-0 right-0 py-1.5 px-3 bg-black/85 text-primary text-sm font-bold tracking-widest text-center z-3 pointer-events-none rounded-t"
    >
      {{ formattedMonth }}
    </div>

    <!-- Day number overlay -->
    <div
      data-testid="day-number"
      class="absolute rounded-md bg-black/60 text-white font-black leading-none z-5 pointer-events-none [text-shadow:0_2px_4px_rgba(0,0,0,0.7)] [font-feature-settings:'tnum'_1,'zero'_1] tracking-tight"
      :class="props.compact
        ? 'bottom-1 left-1 py-0.5 px-1.5 min-w-6 text-sm'
        : 'bottom-2 left-2 py-1.5 px-2.5 min-w-12 text-2xl'"
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

    <!-- Empty state -->
    <template v-else-if="images.length === 0">
      <div
        data-testid="empty-album-cover"
        class="absolute inset-0 rounded-lg overflow-hidden flex items-center justify-center p-3 text-neutral-400 text-sm font-medium text-center"
        :class="isFuture ? 'bg-linear-to-br from-[#1c1c2a] to-[#12121f]' : 'bg-linear-to-br from-[#1a1a1a] to-[#0a0a0a]'"
      >
        <slot name="empty">
          <div
            class="text-xs font-semibold tracking-wide text-neutral-500 uppercase"
          >
            <span>—</span>
          </div>
        </slot>
      </div>
    </template>

    <!-- No artwork fallback -->
    <template v-else-if="!images[0]">
      <div
        class="absolute inset-0 rounded-lg overflow-hidden flex items-center justify-center p-3 text-neutral-400 text-sm font-medium text-center bg-[#1a1a1a]"
        :class="{ 'bg-linear-to-br from-[#1c1c2a] to-[#12121f]': isFuture }"
      >
        <slot name="no-artwork">
          <div class="flex flex-col gap-1.5 w-full">
            <div
              class="text-[11px] font-semibold text-neutral-400 tracking-tight uppercase"
            >
              {{ firstAlbum?.artistName || 'Unknown Artist' }}
            </div>
            <div class="text-[13px] font-bold text-white leading-tight">
              {{ firstAlbum?.albumName || 'Unknown Album' }}
            </div>
          </div>
        </slot>
      </div>
    </template>

    <!-- Stacked album images -->
    <template v-else>
      <NuxtImg
        v-for="(imageUrl, index) in images.slice(0, 4)"
        :key="index"
        :src="imageUrl ?? undefined"
        alt="Album cover"
        data-testid="album-image"
        class="stacked-album absolute inset-0 w-full h-full object-cover rounded-lg"
        :class="[`stack-${index}`, { 'opacity-70': isFuture && images.length === 1 }]"
        :style="{ zIndex: images.length - index }"
      />
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';

export type AlbumCardInfo = {
  imageUrl: string | null;
  artistName: string;
  albumName: string;
};

const props = defineProps<{
  date: string;
  albums: AlbumCardInfo[];
  pending?: boolean;
  /** When true, future days won't be dimmed (useful for date pickers) */
  selectable?: boolean;
  /** When true, uses smaller styling for compact layouts */
  compact?: boolean;
}>();

defineEmits<{
  click: [];
}>();

const cardEl = ref<HTMLElement | null>(null);

const {
  day,
  formatted: { formattedMonth },
  relative: { isFuture, isToday },
} = useDate(props.date);

const albumCount = computed(() => props.albums.length);

const clickable = computed(() => !!albumCount.value);
const images = computed(() => props.albums?.map((a) => a.imageUrl) ?? []);

const firstAlbum = computed(() => props.albums[0]);

// Expose the card element for parent components (e.g., intersection observer)
defineExpose({
  cardEl,
});
</script>

<style>
/* Stacked albums effect - transforms */
.stacked-album {
  transition:
    transform 0.3s ease,
    filter 0.35s ease;
}

.stacked-album.stack-0 {
  transform: translate(0, 0) rotate(0deg);
}
.stacked-album.stack-1 {
  transform: translate(4px, 4px) rotate(2deg);
}
.stacked-album.stack-2 {
  transform: translate(8px, 8px) rotate(-2deg);
}
.stacked-album.stack-3 {
  transform: translate(12px, 12px) rotate(1deg);
}

/* On hover, fan out the cards */
.album-day-card.cursor-pointer:hover .stacked-album.stack-1 {
  transform: translate(6px, 6px) rotate(3deg);
}
.album-day-card.cursor-pointer:hover .stacked-album.stack-2 {
  transform: translate(12px, 12px) rotate(-3deg);
}
.album-day-card.cursor-pointer:hover .stacked-album.stack-3 {
  transform: translate(18px, 18px) rotate(2deg);
}

/* Album image: partial desaturation by default */
.album-day-card .stacked-album.stack-0 {
  filter: grayscale(60%) brightness(0.85) contrast(0.95);
}
.album-day-card .stacked-album.stack-1 {
  filter: grayscale(60%) brightness(0.75) contrast(0.95);
}
.album-day-card .stacked-album.stack-2 {
  filter: grayscale(60%) brightness(0.65) contrast(0.95);
}
.album-day-card .stacked-album.stack-3 {
  filter: grayscale(60%) brightness(0.55) contrast(0.95);
}

/* Restore colour on hover */
.album-day-card:hover .stacked-album.stack-0 {
  filter: grayscale(0%) brightness(1) contrast(1);
}
.album-day-card:hover .stacked-album.stack-1 {
  filter: grayscale(0%) brightness(0.85) contrast(1);
}
.album-day-card:hover .stacked-album.stack-2 {
  filter: grayscale(0%) brightness(0.7) contrast(1);
}
.album-day-card:hover .stacked-album.stack-3 {
  filter: grayscale(0%) brightness(0.6) contrast(1);
}

/* Today's card glow */
.album-day-card.today {
  box-shadow: 0 0 24px rgba(29, 185, 84, 0.4);
}

/* Restore colour for today */
.album-day-card.today .stacked-album.stack-0 {
  filter: grayscale(0%) brightness(1) contrast(1);
}
.album-day-card.today .stacked-album.stack-1 {
  filter: grayscale(0%) brightness(0.85) contrast(1);
}
.album-day-card.today .stacked-album.stack-2 {
  filter: grayscale(0%) brightness(0.7) contrast(1);
}
.album-day-card.today .stacked-album.stack-3 {
  filter: grayscale(0%) brightness(0.6) contrast(1);
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .album-day-card .stacked-album {
    transition: none;
  }
}
</style>
