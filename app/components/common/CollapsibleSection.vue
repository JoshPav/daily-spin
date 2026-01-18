<template>
  <UCollapsible v-model:open="model" :class="containerClass">
    <UButton
      block
      color="neutral"
      :variant="variant"
      :size="size"
      :icon="icon"
      :trailing-icon="model ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
      :class="buttonClass"
      :ui="{
        trailingIcon: 'text-muted size-4',
      }"
    >
      <slot name="trigger" />
    </UButton>

    <template #content>
      <slot />
    </template>
  </UCollapsible>
</template>

<script setup lang="ts">
const model = defineModel<boolean>({ default: false });

withDefaults(
  defineProps<{
    icon?: string;
    variant?: 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost' | 'link';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    containerClass?: string;
    buttonClass?: string;
  }>(),
  {
    variant: 'subtle',
    size: 'lg',
    containerClass: 'flex flex-col gap-2',
  },
);
</script>
