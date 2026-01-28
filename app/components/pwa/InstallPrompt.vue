<template>
  <Transition name="slide-up">
    <div
      v-if="showInstallPrompt"
      class="fixed bottom-0 left-0 right-0 z-50 p-4 bg-elevated border-t border-default"
    >
      <div class="max-w-md mx-auto flex items-center gap-4">
        <div class="shrink-0">
          <img
            src="/icons/icon.svg"
            alt="DailySpin"
            class="w-12 h-12 rounded-lg"
          >
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-default">Install DailySpin</p>
          <p class="text-sm text-muted">
            Add to your home screen for quick access
          </p>
        </div>
        <div class="shrink-0 flex gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            @click="handleDismiss"
          >
            Not now
          </UButton>
          <UButton
            color="primary"
            size="sm"
            :icon="Icons.DOWNLOAD"
            @click="handleInstall"
          >
            Install
          </UButton>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import { Icons } from '~/components/common/icons';

const pwa = usePWA();

const showInstallPrompt = computed(() => pwa?.showInstallPrompt ?? false);

const handleInstall = async () => {
  await pwa?.install();
};

const handleDismiss = () => {
  pwa?.cancelInstall();
};
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
