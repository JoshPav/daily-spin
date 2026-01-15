<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui';
import { signOut } from '~/lib/auth-client';
import { Route } from '~/pages/routes';
import { Icons } from './common/icons';

const { loggedIn, user, loading } = useAuth();
const router = useRouter();
const route = useRoute();

const navItems = computed<NavigationMenuItem[][]>(() => [
  [
    {
      label: 'Dashboard',
      icon: 'i-lucide-calendar',
      to: Route.DASHBOARD,
      active: route.path === Route.DASHBOARD,
    },
    {
      label: 'Backlog',
      icon: 'i-lucide-list-music',
      to: Route.BACKLOG,
      active: route.path === Route.BACKLOG,
    },
  ],
]);

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
  <UHeader title="DailySpin" :to="loggedIn ? Route.DASHBOARD : Route.LANDING_PAGE">
    <template v-if="loggedIn" #body>
      <UNavigationMenu :items="navItems" highlight />
    </template>

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
