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
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    leave-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-4"
    leave-to-class="opacity-0 translate-y-4"
  >
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
