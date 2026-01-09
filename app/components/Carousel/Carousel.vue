<template>
  <div class="carousel">
    <CarouselNavButtons
      v-show="items.length > 1"
      @prev="prev"
      @next="next"
    />

    <div
      class="carousel-content"
      v-bind="touchHandlers"
    >
      <Transition :name="transitionName" mode="out-in">
        <div :key="currentIndex">
          <slot :item="currentItem" :index="currentIndex" />
        </div>
      </Transition>
    </div>

    <CarouselIndicators
      v-show="items.length > 1"
      :item-count="items.length"
      :current-index="currentIndex"
      @clicked="goTo"
    />
  </div>
</template>

<script setup lang="ts" generic="T">
import CarouselNavButtons from './CarouselNavButtons.vue';
import CarouselIndicators from './CarouselIndicators.vue';

const props = defineProps<{
  items: T[];
  loop?: boolean;
}>();

const {
  currentIndex,
  currentItem,
  transitionName,
  prev,
  next,
  goTo,
  touchHandlers,
} = useCarousel(props.items, { loop: props.loop });
</script>

<style scoped>
.carousel {
  position: relative;
  width: 100%;
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
  .carousel-content {
    cursor: default;
  }

  .carousel-content:active {
    cursor: default;
  }
}
</style>
