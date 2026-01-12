<template>
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path v-if="direction === 'left'" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
    <path v-else d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  direction: 'left' | 'right';
}>();
</script>
