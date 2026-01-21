<script setup lang="ts">
import { Icons } from '~/components/common/icons';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <Transition name="jump-to-today">
    <UButton
      v-if="visible"
      :icon="Icons.CALENDAR.TODAY"
      color="primary"
      variant="solid"
      size="lg"
      class="fixed bottom-6 right-6 z-50 shadow-lg"
      aria-label="Jump to today"
      @click="emit('click')"
    >
      Today
    </UButton>
  </Transition>
</template>

<style scoped>
.jump-to-today-enter-active,
.jump-to-today-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.jump-to-today-enter-from,
.jump-to-today-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
</style>
