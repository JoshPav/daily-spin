<template>
  <UButton
    v-on:click="onClick"
    :size="size"
    :icon="Icons.SPOTIFY"
    variant="solid"
    :label="label"
    class="text-white font-semibold rounded-sm hover:cursor-pointer bg-(--color-spotify-brand-green) hover:bg-(--color-spotify-brand-green-hover)"
    :loading="loading"
  />
</template>

<script lang="ts" setup>
import { Icons } from '~/components/common/icons';
import { signIn } from '~/lib/auth-client';
import { Route } from '~/pages/routes';

withDefaults(
  defineProps<{ label?: string; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }>(),
  {
    label: 'Get started',
  },
);

const loading = ref(false);

const toast = useToast();

const onClick = async () => {
  loading.value = true;

  try {
    await signIn.social({
      provider: 'spotify',
      callbackURL: Route.DASHBOARD,
      fetchOptions: {
        onError: () => {
          loading.value = false;
        },
      },
    });
  } catch (err) {
    loading.value = false;

    toast.add({
      title: 'Uh oh! Something went wrong.',
      description:
        "We couldn't connect to Spotify right now. Try again later. ",
      icon: Icons.WIFI,
      progress: false,
      color: 'error',
    });
  }
};
</script>

<style>
</style>
