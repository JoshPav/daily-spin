<template>
  <button
    :class="['button', `button--${variant}`]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="spinner"></span>
    <span v-else>
      <slot />
    </span>
  </button>
</template>

<script lang="ts" setup>
defineProps<{
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
}>();

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<style scoped>
.button {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Primary variant (save-button style) */
.button--primary {
  width: 100%;
  padding: 14px 24px;
  background-color: #1db954;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
}

.button--primary:hover:not(:disabled) {
  background-color: #1ed760;
  transform: translateY(-2px);
}

/* Secondary variant (change-button style) */
.button--secondary {
  padding: 6px 12px;
  background-color: transparent;
  color: #b3b3b3;
  border: 1px solid #404040;
  font-size: 14px;
}

.button--secondary:hover:not(:disabled) {
  background-color: #282828;
  border-color: #1db954;
  color: #1db954;
}

/* Spinner animation */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
