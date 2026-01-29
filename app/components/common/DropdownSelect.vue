<template>
  <UDropdownMenu :items="dropdownItems" :disabled="disabled">
    <UButton
      color="primary"
      variant="outline"
      :disabled="disabled"
      :data-testid="testId"
    >
      <UIcon v-if="selectedIcon" :name="selectedIcon" class="text-lg" />
      <span v-if="selectedLabel" :class="{ 'hidden md:block': iconOnly }"
        >{{ selectedLabel }}</span
      >
    </UButton>
  </UDropdownMenu>
</template>

<script setup lang="ts" generic="T extends string | number">
/**
 * DropdownSelect - A dropdown component that supports cycling through values
 *
 * Features:
 * - Single value options that navigate to that value
 * - Multi-value options that cycle through values on each click
 * - Value-specific labels and icons
 * - Direction indicators for two-value cycling options
 */

import type { DropdownOption } from '~/composables/components/useDropdownSelectOptions';

export type {
  DropdownOption,
  DropdownOptionValue,
} from '~/composables/components/useDropdownSelectOptions';

const props = defineProps<{
  options: DropdownOption<T>[];
  label?: string;
  iconOnly?: boolean;
  disabled?: boolean;
  testId?: string;
}>();

const modelValue = defineModel<T>({ required: true });

const { selectedLabel, selectedIcon, dropdownItems } = useDropdownSelectOptions(
  toRef(() => props.options),
  modelValue,
  props.label,
);
</script>
