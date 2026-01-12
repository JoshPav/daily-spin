<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { signOut } from '~/lib/auth-client';

const { loggedIn, user } = useAuth();

const menuItems = ref<DropdownMenuItem[]>([
  {
    label: 'Preferences',
    icon: 'i-heroicons-cog-6-tooth',
  },
  {
    label: 'Sign out',
    icon: 'i-heroicons-arrow-right-on-rectangle',
    onSelect: async () => {
      await signOut();
      navigateTo('/login');
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
    </template>
  </UHeader>
</template>
