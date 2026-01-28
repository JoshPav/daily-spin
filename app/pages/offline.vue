<template>
  <div
    class="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center"
  >
    <div
      class="w-30 h-30 bg-[#1a1a1a] rounded-full flex items-center justify-center mb-8 shadow-lg"
    >
      <span class="text-4 font-extrabold tracking-tight">DailySpin</span>
    </div>

    <UIcon :name="Icons.WIFI_OFF" class="size-12 text-neutral-500 mb-6" />

    <h1 class="text-2xl font-bold mb-3">You're offline</h1>

    <p class="text-neutral-400 max-w-xs leading-relaxed mb-8">
      It looks like you've lost your internet connection. Please check your
      connection and try again.
    </p>

    <UButton
      color="primary"
      size="lg"
      class="bg-[#1db954] hover:bg-[#1ed760]"
      @click="retry"
    >
      Try again
    </UButton>
  </div>
</template>

<script lang="ts" setup>
import { Icons } from '~/components/common/icons';

definePageMeta({
  layout: false,
});

const retry = () => {
  window.location.reload();
};
</script>
