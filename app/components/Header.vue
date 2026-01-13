<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { signOut } from '~/lib/auth-client';
import { Route } from '~/pages/routes';
import { Icons } from './common/icons';

const { loggedIn, user, loading } = useAuth();
const router = useRouter();

const menuItems = computed<DropdownMenuItem[]>(() => [
  [
    {
      type: 'label',
      label: user.value?.name,
      avatar: {
        src: user.value?.image,
        alt: user.value?.initial,
      },
    },
  ],
  [
    {
      label: 'Bulk import',
      icon: Icons.IMPORT,
      class: 'hover:cursor-pointer',
      disabled: true,
    },
    {
      label: 'Preferences',
      icon: Icons.SETTINGS,
      class: 'hover:cursor-pointer',
      disabled: true,
    },
  ],
  [
    {
      label: 'Sign out',
      icon: Icons.LOG_OUT,
      class: 'hover:cursor-pointer',
      onSelect: async () => {
        await signOut({
          fetchOptions: {
            onSuccess: async () => void router.push(Route.LANDING_PAGE),
          },
        });
      },
    },
  ],
]);
</script>

<template>
  <UHeader title="Album of the Day">
    <template #toggle>
      <USkeleton v-if="loading" class="h-8 w-8 rounded-full mr-1.5"/>
      <UDropdownMenu
        v-else-if="loggedIn"
        size="xl"
        :arrow="true"
        :items="menuItems"
        :content="{ align: 'end' }"
      >
        <UButton class="hover:cursor-pointer" variant="ghost" :avatar="{
          src: user?.image,
          size: 'md',
          alt: user?.initial
        }" />
      </UDropdownMenu>
      <LoginWithSpotifyButton v-else label="Sign in"  />
    </template>
  </UHeader>
</template>
