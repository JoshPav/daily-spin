<template>
  <div class="album-carousel">
    <!-- Navigation buttons -->
    <button
      v-if="albums.length > 1"
      class="nav-button prev"
      @click="prev"
      aria-label="Previous album"
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
      </svg>
    </button>

    <button
      v-if="albums.length > 1"
      class="nav-button next"
      @click="next"
      aria-label="Next album"
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
      </svg>
    </button>

    <!-- Carousel content -->
    <div
      ref="carouselContent"
      class="carousel-content"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <Transition :name="transitionName" mode="out-in">
        <AlbumCarouselItem
          :key="currentAlbum.album.albumId"
          :album-listen="currentAlbum"
          :style="currentIndex === 0 && viewTransitionName
            ? { viewTransitionName }
            : undefined"
        />
      </Transition>
    </div>

    <!-- Indicators -->
    <div v-if="albums.length > 1" class="carousel-indicators">
      <button
        v-for="(album, index) in albums"
        :key="album.album.albumId"
        class="indicator"
        :class="{ active: index === currentIndex }"
        @click="goTo(index)"
        :aria-label="`Go to album ${index + 1}`"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { DailyAlbumListen } from '#shared/schema';

const props = defineProps<{
  albums: DailyAlbumListen[];
  viewTransitionName?: string | null;
}>();

const currentIndex = ref(0);
const transitionName = ref<'slide-left' | 'slide-right'>('slide-right');
const carouselContent = ref<HTMLElement | null>(null);

// Touch/swipe handling
const touchStartX = ref(0);
const touchEndX = ref(0);
const touchStartY = ref(0);
const touchEndY = ref(0);
const isSwiping = ref(false);

const currentAlbum = computed(() => props.albums[currentIndex.value]);

const prev = () => {
  transitionName.value = 'slide-right';
  if (currentIndex.value > 0) {
    currentIndex.value--;
  } else {
    // Loop to the last album
    currentIndex.value = props.albums.length - 1;
  }
};

const next = () => {
  transitionName.value = 'slide-left';
  if (currentIndex.value < props.albums.length - 1) {
    currentIndex.value++;
  } else {
    // Loop back to the first album
    currentIndex.value = 0;
  }
};

const goTo = (index: number) => {
  if (index === currentIndex.value) return;
  transitionName.value = index > currentIndex.value ? 'slide-left' : 'slide-right';
  currentIndex.value = index;
};

// Touch/swipe handlers
const handleTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.touches[0].clientX;
  touchStartY.value = e.touches[0].clientY;
  isSwiping.value = false;
};

const handleTouchMove = (e: TouchEvent) => {
  touchEndX.value = e.touches[0].clientX;
  touchEndY.value = e.touches[0].clientY;

  // Calculate distances
  const deltaX = Math.abs(touchEndX.value - touchStartX.value);
  const deltaY = Math.abs(touchEndY.value - touchStartY.value);

  // If horizontal swipe is more prominent than vertical, mark as swiping
  if (deltaX > deltaY && deltaX > 10) {
    isSwiping.value = true;
    // Prevent vertical scrolling when swiping horizontally
    e.preventDefault();
  }
};

const handleTouchEnd = () => {
  if (!isSwiping.value) return;

  const swipeDistance = touchStartX.value - touchEndX.value;
  const minSwipeDistance = 50; // Minimum distance for a swipe to register

  if (Math.abs(swipeDistance) > minSwipeDistance) {
    if (swipeDistance > 0) {
      // Swiped left, go to next
      next();
    } else {
      // Swiped right, go to previous
      prev();
    }
  }

  // Reset values
  touchStartX.value = 0;
  touchEndX.value = 0;
  touchStartY.value = 0;
  touchEndY.value = 0;
  isSwiping.value = false;
};

// Keyboard navigation
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft') {
    prev();
  } else if (e.key === 'ArrowRight') {
    next();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.album-carousel {
  position: relative;
  width: 100%;
}

.nav-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;

  width: 48px;
  height: 48px;
  border-radius: 50%;

  background-color: rgba(0, 0, 0, 0.7);
  color: #ffffff;
  border: none;

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-button:hover {
  background-color: rgba(29, 185, 84, 0.9);
  transform: translateY(-50%) scale(1.1);
}

.nav-button.prev {
  left: 16px;
}

.nav-button.next {
  right: 16px;
}

.carousel-content {
  width: 100%;
  overflow: hidden;
  touch-action: pan-y pinch-zoom;
  user-select: none;
  cursor: grab;
}

.carousel-content:active {
  cursor: grabbing;
}

.carousel-indicators {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
}

.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #535353;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0;
}

.indicator:hover {
  background-color: #b3b3b3;
  transform: scale(1.2);
}

.indicator.active {
  background-color: #1db954;
  width: 24px;
  border-radius: 4px;
}

/* Slide transitions */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

@media (max-width: 768px) {
  .nav-button {
    display: none;
  }

  .carousel-content {
    cursor: default;
  }

  .carousel-content:active {
    cursor: default;
  }
}
</style>
