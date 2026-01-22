<template>
  <UCard>
    <template #header>
      <div class="flex flex-row justify-between items-start gap-4">
        <div>
          <h2 class="text-xl font-bold">{{ title }}</h2>
          <p class="text-sm text-muted mt-1" v-if="!!description">
            {{ description }}
          </p>
        </div>

        <slot name="headerRight" />
      </div>
    </template>

    <slot />
  </UCard>
</template>

<script lang="ts" setup>
defineProps<{ title: string; description?: string }>();
</script>
