<template>
  <div class="carousel-indicators">
    <button
      v-for="index in itemCount"
      :key="index"
      class="indicator"
      :class="{ active: index - 1 === currentIndex }"
      @click="emit('clicked', index - 1)"
      :aria-label="`Go to item ${index}`"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  itemCount: number;
  currentIndex: number;
}>();

const emit = defineEmits<{
  clicked: [index: number];
}>();
</script>

<style scoped>
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
</style>
