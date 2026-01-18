<template>
  <div v-if="requiresReauth" class="p-4">
    <UAlert
      :icon="Icons.WARNING"
      title="Spotify connection expired"
      color="warning"
      variant="soft"
      class=""
    >
      <template #description>
        <a class="underline cursor-pointer font-bold" @click="reconnect"
          >Sign in</a
        >
        again to continue tracking your listening history.
      </template>
    </UAlert>
  </div>
</template>

<script lang="ts" setup>
import { Icons } from '~/components/common/icons';
import { signIn } from '~/lib/auth-client';

const { requiresReauth } = useAuth();
const route = useRoute();
const toast = useToast();

const reconnect = async () => {
  try {
    await signIn.social({
      provider: 'spotify',
      callbackURL: route.fullPath,
    });
  } catch {
    toast.add({
      title: 'Uh oh! Something went wrong.',
      description: "We couldn't connect to Spotify right now. Try again later.",
      icon: Icons.WIFI,
      progress: false,
      color: 'error',
    });
  }
};
</script>
