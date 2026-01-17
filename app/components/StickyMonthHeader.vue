<template>
  <Transition name="fade">
    <div class="sticky top-10 z-100 col-span-full py-3 px-4 mx-auto mb-4 max-w-fit bg-black/90 backdrop-blur text-primary font-bold tracking-widest uppercase rounded-lg shadow-lg pointer-events-none">
      {{ formattedMonth }}
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { formattedMonth } = useCurrentMonth();
</script>

<style scoped>
/* Fade transition for Vue Transition component */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
