<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

const { loggedIn, user } = await useAuth();

const menuItems: DropdownMenuItem[] = [
  [
    {},
    {
      label: 'Preferences',
      icon: 'i-heroicons-cog-6-tooth',
      click: () => {
        console.log('preferences');
      },
    },
  ],
  [
    {
      label: 'Sign out',
      icon: 'i-heroicons-arrow-right-on-rectangle',
      click: () => {
        console.log('sign out');
      },
    },
  ],
];

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
