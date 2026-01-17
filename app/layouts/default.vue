<template>
  <div class="layout-container">
    <slot />
  </div>
</template>

<style scoped>
.layout-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding-top: var(--ui-header-height);
  overflow: hidden;
}
</style>
