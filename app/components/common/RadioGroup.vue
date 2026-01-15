<template>
  <URadioGroup
    v-model="currentValue"
    :items="items"
    :legend="label"
    indicator="hidden"
    variant="table"
    orientation="horizontal"
    :ui="{ container: 'flex', item: 'flex-1' }"
  >
    <template #label="{ item }">
      <div class="flex flex-col items-center justify-center gap-1 md:gap-1.5 w-full">
        <template v-if="item.icon">
          <component v-if="isComponent(item.icon)" :is="item.icon" class="text-lg md:text-2xl" />
          <UIcon v-else :name="item.icon" class="text-lg md:text-2xl" />
        </template>
        <span class="text-xs md:text-sm">{{ item.label }}</span>
      </div>
    </template>
  </URadioGroup>
</template>

<script lang="ts" setup generic="T extends string">
import type { Component } from 'vue';
import type { RadioOption } from './RadioGroup.types';

defineProps<{
  label: string;
  items: RadioOption<T>[];
}>();

const currentValue = defineModel<T>();

// Type guard to check if icon is a Component
const isComponent = (icon: string | Component): icon is Component => {
  return typeof icon === 'function' || typeof icon === 'object';
};
</script>
