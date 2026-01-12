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

const avatarAlt = computed(() => {
  return user.value?.name || user.value?.initial || 'User';
});

const avatarSrc = computed(() => {
  return user.value?.image;
});
</script>

<template>
  <UHeader title="Album of the Day">
    <template #toggle>
      <UDropdownMenu
        v-if="loggedIn"
        :items="menuItems"
      >
        <UButton variant="ghost" :avatar="{
          src: avatarSrc,
          size: 'sm',
          alt: avatarAlt
        }" />
      </UDropdownMenu>
      <!-- Needed to prevent UHeader from rendering the Drawer by default -->
      <span v-else aria-hidden="true"></span>
    </template>
  </UHeader>
</template>
