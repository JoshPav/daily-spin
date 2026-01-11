<template>
  <fieldset class="radio-select">
    <legend class="radio-legend">{{ label }}</legend>

    <div class="radio-options">
      <label class="radio-card" v-for="{ text, value, icon } in options">
      <input v-model="currentValue" type="radio" :name="value" :value="value" />
      <div class="radio-card-content">
        <component v-if="icon" :is="icon" />
        <span>{{ text }}</span>
      </div>
    </label>
    </div>
  </fieldset>
</template>

<script lang="ts" setup generic="T extends string">
import type { Component } from 'vue';

export type RadioOption<T> = {
  icon?: Component;
  value: T;
  text: string;
};

const currentValue = defineModel<T>();

defineProps<{ label: string; options: RadioOption<T>[] }>();
</script>

<style>

.radio-select {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: none;
  padding: 0;
  margin: 0;
}

.radio-legend {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  padding: 0;
  margin-bottom: 4px;
}

.radio-options {
  display: flex;
  gap: 12px;
}

.radio-card {
  flex: 1 1 0;
  cursor: pointer;
  position: relative;
  min-width: 0;
}

.radio-card input[type='radio'] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.radio-card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 12px;
  min-height: 80px;
  background-color: #282828;
  border: 2px solid #404040;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.radio-card:hover .radio-card-content {
  background-color: #333333;
  border-color: #555555;
}

.radio-card input[type='radio']:checked + .radio-card-content {
  border-color: #1db954;
  background-color: #1a1a1a;
}

.radio-card-content svg {
  width: 32px;
  height: 32px;
  color: #b3b3b3;
  transition: color 0.2s ease;
}

.radio-card input[type='radio']:checked + .radio-card-content svg {
  color: #1db954;
}

.radio-card-content span {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #b3b3b3;
  transition: color 0.2s ease;
}

.radio-card input[type='radio']:checked + .radio-card-content span {
  color: #ffffff;
}

/* Desktop styles */
@media (min-width: 768px) {
  .radio-card-content {
    padding: 12px 10px;
    min-height: 70px;
    gap: 6px;
  }

  .radio-card-content svg {
    width: 24px;
    height: 24px;
  }

  .radio-card-content span {
    font-size: 13px;
  }
}

</style>