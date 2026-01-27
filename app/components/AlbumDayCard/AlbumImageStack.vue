<template>
  <!-- Empty state -->
  <div
    v-if="images.length === 0"
    data-testid="empty-album-cover"
    class="absolute inset-0 rounded-lg overflow-hidden flex items-center justify-center p-3 text-neutral-400 text-sm font-medium text-center border border-neutral-700/50"
    :class="
      isFuture
        ? 'bg-linear-to-br from-[#1c1c2a] to-[#12121f]'
        : 'bg-linear-to-br from-[#1a1a1a] to-[#0a0a0a]'
    "
  >
    <slot name="empty">
      <div
        class="text-xs font-semibold tracking-wide text-neutral-500 uppercase"
      >
        <span>&mdash;</span>
      </div>
    </slot>
  </div>

  <!-- No artwork fallback -->
  <div
    v-else-if="!images[0]"
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

  <!-- Stacked album images -->
  <template v-else>
    <NuxtImg
      v-for="(imageUrl, index) in images.slice(0, 4)"
      :key="index"
      :src="imageUrl ?? undefined"
      alt="Album cover"
      data-testid="album-image"
      class="stacked-album absolute inset-0 w-full h-full object-cover rounded-lg"
      :class="[
        `stack-${index}`,
        { 'opacity-70': isFuture && images.length === 1 },
      ]"
      :style="{ zIndex: images.length - index }"
    />
  </template>
</template>

<script lang="ts" setup>
defineProps<{
  images: (string | null)[];
  isFuture?: boolean;
  firstAlbum?: {
    artistName: string;
    albumName: string;
  } | null;
}>();
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

/* Restore colour on hover (only for interactive cards) */
.album-day-card:not(.non-interactive):hover .stacked-album.stack-0 {
  filter: grayscale(0%) brightness(1) contrast(1);
}
.album-day-card:not(.non-interactive):hover .stacked-album.stack-1 {
  filter: grayscale(0%) brightness(0.85) contrast(1);
}
.album-day-card:not(.non-interactive):hover .stacked-album.stack-2 {
  filter: grayscale(0%) brightness(0.7) contrast(1);
}
.album-day-card:not(.non-interactive):hover .stacked-album.stack-3 {
  filter: grayscale(0%) brightness(0.6) contrast(1);
}

/* Today's card - restore colour */
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

/* Full color mode (no grayscale filter) */
.album-day-card.full-color .stacked-album.stack-0 {
  filter: grayscale(0%) brightness(1) contrast(1);
}
.album-day-card.full-color .stacked-album.stack-1 {
  filter: grayscale(0%) brightness(0.85) contrast(1);
}
.album-day-card.full-color .stacked-album.stack-2 {
  filter: grayscale(0%) brightness(0.7) contrast(1);
}
.album-day-card.full-color .stacked-album.stack-3 {
  filter: grayscale(0%) brightness(0.6) contrast(1);
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .album-day-card .stacked-album {
    transition: none;
  }
}
</style>
