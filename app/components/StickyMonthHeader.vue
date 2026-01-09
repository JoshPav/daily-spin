<template>
  <Transition name="fade">
    <div  class="sticky-month-header">
      {{ formattedMonth }}
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { formattedMonth } = useCurrentMonth();
</script>

<style scoped>
.sticky-month-header {
  position: sticky;
  top: 8px;
  z-index: 100;

  /* Span all grid columns */
  grid-column: 1 / -1;

  padding: 12px 16px;
  margin: 0 auto 16px;
  max-width: fit-content;

  background-color: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);
  color: #1db954;

  font-family: 'Montserrat', sans-serif;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-align: center;
  text-transform: uppercase;

  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

  pointer-events: none;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
