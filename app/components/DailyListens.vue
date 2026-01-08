<template>
  <div
    class="album-cover"
    :class="{ today: isToday, clickable: !!dayAlbum }"
    :style="dayAlbum && viewTransitionName
          ? { viewTransitionName }
          : undefined"
    @click="handleClick"
  >
    <!-- Month banner (only on day 1) -->
    <div v-if="showMonthBanner" class="month-banner">
      {{ monthYearDisplay }}
    </div>

    <!-- Day number overlay -->
    <div class="day-overlay">
      {{ dayOfMonth }}
    </div>

    <!-- Play order icon -->
    <div v-if="dayAlbum" class="icon-wrapper">
      <Tooltip
        :text="dayAlbum?.listenMetadata.inOrder ? 'Listened in order' : 'Listened on shuffle'"
      >
        <div class="order-icon">
          <OrderedIcon v-if="dayAlbum?.listenMetadata.inOrder" />
          <ShuffleIcon v-else />
        </div>
      </Tooltip>
    </div>

    <div v-if="!dayAlbum" class="empty no-listen">
      <div class="empty-message">No Album Played</div>
    </div>
    <div v-else-if="pending" class="skeleton"></div>
    <div v-else-if="!albumArtworkSrc" class="empty no-artwork">
      <div class="album-info">
        <div class="artist-name">{{ album?.artists?.[0]?.name || 'Unknown Artist' }}</div>
        <div class="album-name">{{ album?.name || 'Unknown Album' }}</div>
      </div>
    </div>

    <NuxtImg
      v-if="albumArtworkSrc"
      v-show="!!albumArtworkSrc"
      :src="albumArtworkSrc"
      alt="Album cover"
      @load="onImageLoad"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import type { DailyListens } from '#shared/schema';
import { useAlbum } from '~/composables/useAlbum';
import { useAlbumModal } from '~/composables/useAlbumModal';
import { useDate } from '~/composables/useDate';

const { dayListens } = defineProps<{
  dayListens: DailyListens;
}>();

const { open, viewTransitionName } = useAlbumModal();

const handleClick = () => {
  if (!dayAlbum || !album.value) return;

  open({
    date: dayListens.date,
    album: album.value,
    listenMetadata: dayAlbum.listenMetadata,
  });
};

// First album of the day
const [dayAlbum] = dayListens.albums;

const { data: album, pending } = useAlbum(dayAlbum?.albumId);

// Track when the image finishes loading
const imageLoaded = ref(false);

const albumArtworkSrc = computed(() => album.value?.images?.[0]?.url);

// Reset imageLoaded when artwork changes
watch(albumArtworkSrc, () => {
  imageLoaded.value = false;
});

const onImageLoad = () => {
  imageLoaded.value = true;
};

// Date utilities
const { dayOfMonth, monthYearDisplay, isToday, showMonthBanner } = useDate(
  dayListens.date,
);
</script>

<style>
.album-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;

  border-radius: 8px;

  background-color: #121212;

  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.album-cover img,
.album-cover .skeleton,
.album-cover .empty {
  border-radius: 8px;
  overflow: hidden;
}

.album-cover.clickable {
  cursor: pointer;
}

.album-cover.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
}


.month-banner {
  position: absolute;
  top: -32px;
  left: 0;
  right: 0;

  padding: 6px 12px;

  background-color: rgba(0, 0, 0, 0.85);
  color: #1db954;

  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-align: center;

  z-index: 3;
  pointer-events: none;

  border-radius: 4px 4px 0 0;
}

.day-overlay {
  position: absolute;
  bottom: 8px;
  left: 8px;

  padding: 6px 10px;
  min-width: 48px;
  border-radius: 6px;

  background-color: rgba(0, 0, 0, 0.6);
  color: #ffffff;

  font-family: 'Montserrat', sans-serif;
  font-size: 24px;
  font-weight: 900;
  line-height: 1;

  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);

  /* tabular numbers for consistent width */
  font-feature-settings: "tnum" 1, "zero" 1;
  letter-spacing: 0.02em;

  z-index: 4;
  pointer-events: none;
}

.icon-wrapper {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.order-icon {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 36px;
  height: 36px;
  border-radius: 50%;

  background-color: rgba(0, 0, 0, 0.7);
  color: #1db954;

  backdrop-filter: blur(4px);

  cursor: help;

  transition: all 0.2s ease;
}

.order-icon:hover {
  background-color: rgba(0, 0, 0, 0.85);
  transform: scale(1.1);
}

.order-icon svg {
  display: block;
}


/* =========================
   Skeleton loading
   ========================= */
.skeleton {
  position: absolute;
  inset: 0;

  background: linear-gradient(
    90deg,
    #2a2a2a 25%,
    #3a3a3a 37%,
    #2a2a2a 63%
  );
  background-size: 400% 100%;

  animation: skeleton-shimmer 2.5s ease infinite;
}

/* =========================
   Empty states
   ========================= */
.empty {
  position: absolute;
  inset: 0;

  background-color: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;

  color: #b3b3b3;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
}

.empty.no-listen {
  background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
}

.empty-message {
  font-family: 'Montserrat', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #666;
  text-transform: uppercase;
}

.empty.no-artwork {
  background-color: #1a1a1a;
}

.album-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.artist-name {
  font-family: 'Montserrat', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #b3b3b3;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.album-name {
  font-family: 'Montserrat', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
}

/* =========================
   Album image
   ========================= */
.album-cover img {
  position: absolute;
  inset: 0;

  width: 100%;
  height: 100%;
  object-fit: cover;

  z-index: 1;
}



/* =========================
   Animations
   ========================= */
@keyframes skeleton-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

/* =========================
   Album image: faded by default
   ========================= */
.album-cover img {
  filter: grayscale(100%) brightness(0.75) contrast(0.95);
  transition:
    filter 0.35s ease,
    transform 0.15s ease;
}

/* =========================
   Restore colour on hover
   ========================= */
.album-cover:hover img {
  filter: grayscale(0%) brightness(1) contrast(1);
}

/* =========================
   Restore colour for today
   ========================= */
.album-cover.today img {
  filter: grayscale(0%) brightness(1) contrast(1);
}

/* =========================
   Respect reduced motion
   ========================= */
@media (prefers-reduced-motion: reduce) {
  .album-cover img {
    transition: none;
  }
}


</style>