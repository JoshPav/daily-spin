<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  modelValue: boolean;
  loading?: boolean;
  comingSoon?: boolean;
  changed?: boolean;
}>();

defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

<template>
  <div class="flex items-center justify-between py-2">
    <div class="flex-1">
      <h3 class="text-base font-semibold mb-1">{{ title }}</h3>
      <p class="text-sm text-muted">{{ description }}</p>
    </div>
    <UChip v-if="!comingSoon" :show="!!changed" color="primary" size="md">
      <USwitch
        :model-value="modelValue"
        :loading="loading"
        class="hover:cursor-pointer"
        :ui="{ base: 'hover:cursor-pointer' }"
        @update:model-value="$emit('update:modelValue', $event)"
      />
    </UChip>
    <UBadge v-if="comingSoon" color="warning" variant="subtle" size="md">
      Coming Soon
    </UBadge>
  </div>
</template>
