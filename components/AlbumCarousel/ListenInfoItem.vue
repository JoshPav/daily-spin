<template>
    <UBadge v-if="typeof icon === 'string'" :icon="icon" size="xl" variant="soft" class="w-fit px-3 py-2">
      {{ text }}
    </UBadge>
    <UBadge v-else size="xl" variant="soft" class="w-fit px-3 py-2 flex items-center gap-2">
      <component :is="icon" />
      {{ text }}
    </UBadge>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  label: string;
  text: string;
  icon: string | Component;
}>();
</script>
