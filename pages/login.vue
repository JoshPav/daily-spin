<template>
  <div>
    <UButton v-on:click="signIn" :icon="SpotifyIcon" color="primary" variant="solid" label="Sign in with Spotify"
        class="text-white font-semibold px-4 py-2 rounded-sm" />
  </div>
</template>

<script lang="ts" setup>
import SpotifyIcon from '~/components/common/Icons/SpotifyIcon.vue';
import { authClient } from '~/lib/auth-client';

const signIn = async () => {
  const data = await authClient.signIn.social({
    provider: 'spotify',
  });
};
</script>

<style>

</style>