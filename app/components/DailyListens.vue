<template>
  <div class="album-cover" :class="{ today: isToday }">
    <!-- Day number overlay -->
    <div class="day-overlay">
      {{ dayListens.dayOfMonth }}
    </div>


    <div v-if="pending" class="skeleton"></div>
    <div v-else-if="!albumArtworkSrc" class="empty">{{  album?.id }}</div>

     <NuxtImg
      v-show="!!albumArtworkSrc"
      :src="albumArtworkSrc"
      alt="Album cover"
      @load="onImageLoad"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useAlbum } from '~/composables/useAlbum';
import type { DailyListens } from '#shared/schema';

const { dayListens } = defineProps<{ dayListens: DailyListens }>();

// First album of the day
const [dayAlbum] = dayListens.albums;

const { data: album, pending } = useAlbum(dayAlbum);

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

const isToday = computed(() => {
  const today = new Date();
  return today.getDate() === dayListens.dayOfMonth;
});
</script>

<style>
.album-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;

  border-radius: 8px;
  overflow: hidden;

  background-color: #121212;

  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.album-cover:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
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

  font-family: 'Orbitron', sans-serif;
  font-style: italic;
  font-size: 26px;
  font-weight: 700;
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

  animation: skeleton-shimmer 1.4s ease infinite;
}

/* =========================
   Empty artwork fallback
   ========================= */
.empty {
  position: absolute;
  inset: 0;

  background-color: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;

  color: #777;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.empty::after {
  content: 'No artwork';
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