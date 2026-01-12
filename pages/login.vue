<template>
  <div>
    <UButton v-on:click="signIn" :icon="SpotifyIcon" color="primary" variant="solid" label="Sign in with Spotify"
        class="text-white font-semibold px-4 py-2 rounded-sm" />
  </div>
</template>

<script lang="ts" setup>
import SpotifyIcon from '~/components/common/Icons/SpotifyIcon.vue';
import { authClient } from '~/lib/auth-client';

// Check if user is already logged in
const { loggedIn } = useAuth();

// Redirect to home page if already authenticated (client-side only)
watch(
  loggedIn,
  (isLoggedIn) => {
    if (isLoggedIn) {
      navigateTo('/');
    }
  },
  { immediate: true },
);

const signIn = async () => {
  console.log('click');
  const data = await authClient.signIn.social({
    provider: 'spotify',
  });
};
</script>

<style>

</style>