<template>
  <div class="tooltip-wrapper" :data-text="text">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  text: string;
}>();
</script>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: flex;
}

.tooltip-wrapper::after {
  content: attr(data-text);
  position: absolute;
  top: calc(100% + 8px);
  right: 0;

  padding: 8px 12px;
  border-radius: 6px;

  background-color: rgba(0, 0, 0, 0.95);
  color: #ffffff;

  font-family: 'Montserrat', sans-serif;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;

  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition: all 0.2s ease;

  pointer-events: none;
  z-index: 10;
}

.tooltip-wrapper:hover::after {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.tooltip-wrapper::before {
  content: '';
  position: absolute;
  top: calc(100% + 2px);
  right: 12px;

  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid rgba(0, 0, 0, 0.95);

  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;

  pointer-events: none;
  z-index: 10;
}

.tooltip-wrapper:hover::before {
  opacity: 1;
  visibility: visible;
}
</style>
