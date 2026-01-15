import type { RadioGroupItem } from '@nuxt/ui';
import type { Component } from 'vue';

export type RadioOption<T extends string = string> = RadioGroupItem & {
  icon?: string | Component;
  value: T;
  label: string;
};
