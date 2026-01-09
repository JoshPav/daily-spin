<template>
  <div class="nav-buttons">
    <button
      class="nav-button prev"
      @click="emit('prev')"
      aria-label="Previous"
    >
      <CaretIcon direction="left" />
    </button>

    <button
      class="nav-button next"
      @click="emit('next')"
      aria-label="Next"
    >
      <CaretIcon direction="right" />
    </button>
  </div>
</template>

<script setup lang="ts">
import CaretIcon from '../Icons/CaretIcon.vue';

const emit = defineEmits<{
  prev: [];
  next: [];
}>();
</script>

<style scoped>
.nav-buttons {
  display: contents;
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

@media (max-width: 768px) {
  .nav-button {
    display: none;
  }
}
</style>
