<template>
    <UBadge :icon="icon" size="xl" variant="soft" class="w-fit px-3 py-2">
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
