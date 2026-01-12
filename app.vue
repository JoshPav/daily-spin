<template> 
  <UApp>
    <NuxtPage /> 
  </UApp>
</template>

<script lang="ts" setup>
// Fonts
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap',
    },
  ],
});
</script>