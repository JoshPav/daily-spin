<template>
  <div
    ref="albumCoverEl"
    class="album-cover"
    :class="{ today: isToday(), clickable: hasContent, future: isFuture }"
    @click="openDailyListensModal"
  >
    <!-- Month banner (only on day 1) -->
    <div v-if="day === 1" class="month-banner">
      {{ formattedMonth }}
    </div>

    <!-- Day number overlay -->
    <div :class="{ today: isToday }" class="day-overlay">
      {{ day }}
    </div>

    <!-- Album count badge -->
    <div v-if="dayListens.albums.length > 1" class="album-count-badge">
      {{ dayListens.albums.length }}
    </div>

    <!-- Scheduled badge for future albums -->
    <div v-if="hasFutureAlbum && isFuture" class="scheduled-badge">
      <UIcon name="i-lucide-calendar-days" class="scheduled-icon" />
    </div>

    <!-- Empty state: no albums and no future album -->
    <div v-if="!hasContent" class="empty no-listen" :class="{ future: isFuture }">
      <div class="empty-message">
        <button v-if="isToday()" class="add-album-button" @click.stop="openAddModal">
          <PlusCircleIcon class="icon" />
        </button>
        <UTooltip v-else-if="!isFuture" text="No albums listened to this day">
          <span>—</span>
        </UTooltip>
      </div>
    </div>
    <div v-else-if="pending" class="skeleton"></div>
    <!-- No artwork fallback for listened albums -->
    <div v-else-if="hasAlbums && firstAlbum && !firstAlbum.album.imageUrl" class="empty no-artwork">
      <div class="album-info">
        <div class="artist-name">{{ firstAlbum.album.artists[0]?.name || 'Unknown Artist' }}</div>
        <div class="album-name">{{ firstAlbum.album.albumName || 'Unknown Album' }}</div>
      </div>
    </div>
    <!-- No artwork fallback for future album -->
    <div v-else-if="hasFutureAlbum && !hasAlbums && !dayListens.futureAlbum?.album.imageUrl" class="empty no-artwork future-album-placeholder">
      <div class="album-info">
        <div class="artist-name">{{ dayListens.futureAlbum?.album.artists[0]?.name || 'Unknown Artist' }}</div>
        <div class="album-name">{{ dayListens.futureAlbum?.album.name || 'Unknown Album' }}</div>
      </div>
    </div>

    <!-- Display listened albums -->
    <template v-if="hasAlbums">
      <NuxtImg
        v-for="(albumListen, index) in dayListens.albums.slice(0, 4)"
        :key="albumListen.album.albumId"
        :src="albumListen.album.imageUrl"
        :alt="`${albumListen.album.albumName} cover`"
        :class="['stacked-album', `stack-${index}`]"
        :style="{ zIndex: dayListens.albums.length - index }"
      />
    </template>

    <!-- Display future scheduled album (only if no listened albums) -->
    <template v-else-if="hasFutureAlbum && dayListens.futureAlbum?.album.imageUrl">
      <NuxtImg
        :src="dayListens.futureAlbum.album.imageUrl"
        :alt="`${dayListens.futureAlbum.album.name} cover`"
        class="stacked-album stack-0 future-album"
      />
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  LazyDailyListensModal,
  LazyFutureListenModal,
  LazyLogAlbumModal,
} from '#components';
import type { DailyListensWithFuture } from '#shared/schema';

const { dayListens, pending = false } = defineProps<{
  dayListens: DailyListensWithFuture;
  pending?: boolean;
}>();

const overlay = useOverlay();
const dailyListensModal = overlay.create(LazyDailyListensModal);
const addAlbumModal = overlay.create(LazyLogAlbumModal);
const futureListenModal = overlay.create(LazyFutureListenModal);

const hasAlbums = computed(() => dayListens.albums.length > 0);
const hasFutureAlbum = computed(() => !!dayListens.futureAlbum);
const hasContent = computed(() => hasAlbums.value || hasFutureAlbum.value);
const firstAlbum = computed(() => dayListens.albums[0]);

const openAddModal = () => {
  addAlbumModal.open({ dateOfListen: date.value });
};

const openDailyListensModal = () => {
  // If it's a future date with a scheduled album, open the future listen modal
  const { futureAlbum } = dayListens;
  if (isFuture.value && futureAlbum && !hasAlbums.value) {
    futureListenModal.open({
      futureListenItem: futureAlbum,
    });
    return;
  }
  dailyListensModal.open({
    dailyListens: dayListens,
  });
};

const {
  day,
  date,
  utils: { isToday, isFuture: calcIsFuture },
  formatted: { formattedMonth },
} = useDate(dayListens.date);

// Sticky month header tracking
const { setCurrentMonth } = useCurrentMonth();
const albumCoverEl = ref<HTMLElement | null>(null);

const isFuture = computed(() => calcIsFuture());

// Track when this item enters the viewport
onMounted(() => {
  if (!albumCoverEl.value) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        // When this item is in the middle/center portion of the viewport
        if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
          setCurrentMonth(date.value);
        }
      });
    },
    {
      threshold: [0.3, 0.5, 0.7],
      rootMargin: '-40% 0px -40% 0px', // Focus on center 20% of viewport
    },
  );

  observer.observe(albumCoverEl.value);

  onUnmounted(() => {
    if (albumCoverEl.value) {
      observer.unobserve(albumCoverEl.value);
    }
  });
});
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

.album-cover.future {
    opacity: 30%;
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

.empty.future {
  background: linear-gradient(135deg, #1c1c2a 0%, #12121f 100%);
}

.empty-message {
  font-family: 'Montserrat', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #666;
  text-transform: uppercase;
}

.add-album-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;

  color: #1db954;

  display: flex;
  align-items: center;
  justify-content: center;

  transition: all 0.2s ease;
}

.add-album-button .icon {
  width: 36px;
  height: 36px;
}

.add-album-button:hover {
  color: #1ed760;
  transform: scale(1.1);
}

.add-album-button:active {
  transform: scale(1.05);
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
   Stacked albums effect
   ========================= */
.stacked-album {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  transition:
    transform 0.3s ease,
    filter 0.35s ease;
}

/* Offset each card slightly */
.stacked-album.stack-0 {
  transform: translate(0, 0) rotate(0deg);
}

.stacked-album.stack-1 {
  transform: translate(4px, 4px) rotate(2deg);
  filter: brightness(0.85);
}

.stacked-album.stack-2 {
  transform: translate(8px, 8px) rotate(-2deg);
  filter: brightness(0.7);
}

.stacked-album.stack-3 {
  transform: translate(12px, 12px) rotate(1deg);
  filter: brightness(0.6);
}

/* On hover, fan out the cards */
.album-cover.clickable:hover .stacked-album.stack-1 {
  transform: translate(6px, 6px) rotate(3deg);
}

.album-cover.clickable:hover .stacked-album.stack-2 {
  transform: translate(12px, 12px) rotate(-3deg);
}

.album-cover.clickable:hover .stacked-album.stack-3 {
  transform: translate(18px, 18px) rotate(2deg);
}

/* =========================
   Album count badge
   ========================= */
.album-count-badge {
  position: absolute;
  top: 8px;
  left: 8px;

  display: flex;
  align-items: center;
  justify-content: center;

  width: 32px;
  height: 32px;
  border-radius: 50%;

  background-color: rgba(29, 185, 84, 0.95);
  color: #ffffff;

  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 700;

  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);

  z-index: 10;
  pointer-events: none;
}

/* =========================
   Scheduled badge for future albums
   ========================= */
.scheduled-badge {
  position: absolute;
  top: 8px;
  right: 8px;

  display: flex;
  align-items: center;
  justify-content: center;

  width: 28px;
  height: 28px;
  border-radius: 6px;

  background-color: rgba(99, 102, 241, 0.9);
  color: #ffffff;

  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);

  z-index: 10;
  pointer-events: none;
}

.scheduled-icon {
  width: 16px;
  height: 16px;
}

/* =========================
   Future album styling
   ========================= */
.future-album {
  opacity: 0.7;
}

.future-album-placeholder {
  background: linear-gradient(135deg, #1c1c2a 0%, #12121f 100%);
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
.album-cover .stacked-album.stack-0 {
  filter: grayscale(100%) brightness(0.75) contrast(0.95);
}

/* Stack cards maintain their brightness offset */
.album-cover .stacked-album.stack-1 {
  filter: grayscale(100%) brightness(0.65) contrast(0.95);
}

.album-cover .stacked-album.stack-2 {
  filter: grayscale(100%) brightness(0.55) contrast(0.95);
}

.album-cover .stacked-album.stack-3 {
  filter: grayscale(100%) brightness(0.45) contrast(0.95);
}

/* =========================
   Restore colour on hover
   ========================= */
.album-cover:hover .stacked-album.stack-0 {
  filter: grayscale(0%) brightness(1) contrast(1);
}

.album-cover:hover .stacked-album.stack-1 {
  filter: grayscale(0%) brightness(0.85) contrast(1);
}

.album-cover:hover .stacked-album.stack-2 {
  filter: grayscale(0%) brightness(0.7) contrast(1);
}

.album-cover:hover .stacked-album.stack-3 {
  filter: grayscale(0%) brightness(0.6) contrast(1);
}

/* =========================
   Restore colour for today
   ========================= */
.album-cover.today .stacked-album.stack-0 {
  filter: grayscale(0%) brightness(1) contrast(1);
}

.album-cover.today .stacked-album.stack-1 {
  filter: grayscale(0%) brightness(0.85) contrast(1);
}

.album-cover.today .stacked-album.stack-2 {
  filter: grayscale(0%) brightness(0.7) contrast(1);
}

.album-cover.today .stacked-album.stack-3 {
  filter: grayscale(0%) brightness(0.6) contrast(1);
}

/* =========================
   Respect reduced motion
   ========================= */
@media (prefers-reduced-motion: reduce) {
  .album-cover .stacked-album {
    transition: none;
  }
}


</style>