<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
import { signOut } from '~/lib/auth-client';
import { Route } from '~/pages/routes';
import { Icons } from '../common/icons';

const { loggedIn, user, loading } = useAuth();
const route = useRoute();

// Quick add modal
const quickAddOpen = ref(false);

const navItems = computed<NavigationMenuItem[][]>(() => [
  [
    {
      label: 'Dashboard',
      icon: Icons.CALENDAR.DAYS,
      to: Route.DASHBOARD,
      active: route.path === Route.DASHBOARD,
    },
    {
      label: 'Backlog',
      icon: Icons.MUSIC.SONG_LIST,
      to: Route.BACKLOG,
      active: route.path === Route.BACKLOG,
    },
  ],
]);

const handleAdded = async () => {
  await refreshNuxtData('backlog');
  navigateTo(Route.BACKLOG);
};

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
  [
    {
      slot: 'add-to-backlog' as const,
      label: 'Add to Backlog',
      icon: Icons.PLUS,
      onSelect: () => {
        quickAddOpen.value = true;
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
            onSuccess: async () =>
              void navigateTo(Route.LANDING_PAGE, { external: true }),
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
    :to="to"
    :ui="{ center: 'md:block', toggle: loggedIn ? '' : 'hidden' }"
    :toggle="{ size: 'xl', disabled: loading }"
    mode="slideover"
  >
    <template v-if="loggedIn">
      <UNavigationMenu :items="navItems" highlight />
    </template>

    <template #right>
      <LoginWithSpotifyButton v-if="!loading && !loggedIn" label="Login" />
    </template>

    <template v-if="loggedIn" #body>
      <UNavigationMenu
        :items="bodyItems"
        highlight
        orientation="vertical"
        variant="pill"
        :ui="{
          link: 'text-xl px-4 py-3',
          label: 'text-xl px-4 py-3',
          linkLeadingIcon: 'size-6',
        }"
      >
        <template #add-to-backlog="{ item }">
          <UButton
            color="primary"
            size="xl"
            :icon="item.icon"
            block
            @click="item.onSelect"
          >
            {{ item.label }}
          </UButton>
        </template>
      </UNavigationMenu>
    </template>
  </UHeader>

  <AddToBacklogModal v-model="quickAddOpen" @added="handleAdded" />
</template>
