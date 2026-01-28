<template>
  <UApp :toaster="{ position: 'top-center' }">
    <Header />

    <UMain as="main">
      <NuxtLayout>
        <ReauthBanner class="mb-4" />
        <NuxtPage />
      </NuxtLayout>
    </UMain>

    <InstallPrompt />
  </UApp>
</template>

<script lang="ts" setup>
// Fonts and PWA meta tags
useHead({
  meta: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1, viewport-fit=cover',
    },
    { name: 'theme-color', content: '#181818' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    {
      name: 'apple-mobile-web-app-status-bar-style',
      content: 'black-translucent',
    },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap',
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Monomaniac+One&display=optional',
    },
    { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
    { rel: 'manifest', href: '/manifest.webmanifest' },
  ],
});
</script>
