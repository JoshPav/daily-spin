<template>
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <!-- Morning: Sunrise -->
    <g v-if="time === 'morning'">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      <path d="M2 18 L6 18 C6 16 4 15 4 13" />
      <path d="M22 18 L18 18 C18 16 20 15 20 13" />
    </g>

    <!-- Noon: Sun at zenith -->
    <g v-else-if="time === 'noon'">
      <circle cx="12" cy="12" r="5" fill="currentColor" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </g>

    <!-- Evening: Sunset -->
    <g v-else-if="time === 'evening'">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <line x1="12" y1="5" x2="12" y2="3" />
      <line x1="5.64" y1="7.64" x2="4.22" y2="6.22" />
      <line x1="3" y1="12" x2="1" y2="12" />
      <line x1="5.64" y1="16.36" x2="4.22" y2="17.78" />
      <line x1="18.36" y1="7.64" x2="19.78" y2="6.22" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="18.36" y1="16.36" x2="19.78" y2="17.78" />
      <line x1="2" y1="21" x2="22" y2="21" />
    </g>

    <!-- Night: Moon and stars -->
    <g v-else-if="time === 'night'">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" />
      <line x1="19" y1="5" x2="19" y2="5.01" />
      <line x1="15" y1="3" x2="15" y2="3.01" />
      <line x1="22" y1="8" x2="22" y2="8.01" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import type { ListenTime } from '#shared/schema';

defineProps<{
  time: ListenTime;
}>();
</script>
