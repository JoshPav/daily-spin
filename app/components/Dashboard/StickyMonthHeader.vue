<template>
  <Transition
    enter-active-class="transition-opacity duration-200 ease-out"
    leave-active-class="transition-opacity duration-200 ease-out"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      data-testid="sticky-month-header"
      class="sticky top-10 z-100 col-span-full py-3 px-4 mx-auto mb-4 max-w-fit bg-black/90 backdrop-blur text-primary font-bold tracking-widest uppercase rounded-lg shadow-lg pointer-events-none"
    >
      {{ formattedMonth }}
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { formattedMonth } = useCurrentMonth();
</script>
