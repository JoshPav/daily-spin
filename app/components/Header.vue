<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
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
      icon: Icons.CALENDAR,
      to: Route.DASHBOARD,
      active: route.path === Route.DASHBOARD,
    },
    {
      label: 'Backlog',
      icon: Icons.BACKLOG,
      to: Route.BACKLOG,
      active: route.path === Route.BACKLOG,
    },
  ],
]);

const bodyItems = computed<NavigationMenuItem[][]>(() => [
  [
    {
      type: 'label',
      label: user.value?.name,
      avatar: {
        src: user.value?.image,
        alt: user.value?.initial,
        size: 'md',
      },
    },
  ],
  ...navItems.value,
  [
    {
      label: 'Bulk import',
      icon: Icons.IMPORT,
      class: 'hover:cursor-pointer',
      disabled: true,
    },
  ],
  [
    {
      label: 'Preferences',
      icon: Icons.SETTINGS,
      to: Route.PREFERENCES,
      active: route.path === Route.PREFERENCES,
    },
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

const to = computed(() =>
  loggedIn.value ? Route.DASHBOARD : Route.LANDING_PAGE,
);
</script>

<template>
  <UHeader 
    title="DailySpin" 
    :to="to" :ui="{ center: 'md:block', toggle: 'block' }"
    :toggle="{ size: 'xl'}"
    mode="slideover">
    <template v-if="loggedIn">
      <UNavigationMenu :items="navItems" highlight />
    </template>

    <template #body>
      <UNavigationMenu :items="bodyItems" highlight orientation="vertical" variant="pill" :ui="{
        link: 'text-xl px-4 py-3',
        label: 'text-xl px-4 py-3',
        linkLeadingIcon: 'size-6'

      }" />
    </template>

  </UHeader>
</template>
