<template>
  <UButton v-on:click="onClick" :icon="SpotifyIcon" color="primary" variant="solid" label="Get started"
        class="text-white font-semibold px-4 py-2 rounded-sm" :loading="loading" />
</template>

<script lang="ts" setup>
import SpotifyIcon from '~/components/common/Icons/SpotifyIcon.vue';
import { signIn } from '~/lib/auth-client';
import { Route } from '~/pages/routes';

const loading = ref(false);

const onClick = async () => {
  loading.value = true;

  await signIn.social({
    provider: 'spotify',
    callbackURL: Route.DASHBOARD,
    fetchOptions: {
      onError: () => {
        loading.value = false;
      },
    },
  });
};
</script>

<style>

</style>