<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { signOut } from '~/lib/auth-client';
import { Route } from '~/pages/routes';

const { loggedIn, user } = useAuth();
const router = useRouter();

const menuItems = ref<DropdownMenuItem[]>([
  {
    label: 'Import',
    icon: 'i-lucide-import',
    disabled: true,
  },
  {
    label: 'Preferences',
    icon: 'i-lucide-settings',
    disabled: true,
  },
  {
    label: 'Sign out',
    icon: 'i-lucide-log-out',
    onSelect: async () => {
      await signOut({
        fetchOptions: {
          onSuccess: async () => void router.push(Route.LANDING_PAGE),
        },
      });
    },
  },
]);
</script>

<template>
  <UHeader title="Album of the Day">
    <template #toggle>

      <UDropdownMenu
        v-if="loggedIn"
        :items="menuItems"
      >
        <UButton variant="ghost" :avatar="{
          src: user?.image,
          size: 'sm',
          alt: user?.initial
        }" />
      </UDropdownMenu>
      <LoginWithSpotifyButton v-else label="Sign in"  />
    </template>
  </UHeader>
</template>
