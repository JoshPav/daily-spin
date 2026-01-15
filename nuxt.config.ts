// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: {
    host: '127.0.0.1',
    port: 3000,
  },
  runtimeConfig: {
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
    spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    public: {
      spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
    },
  },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/image', '@nuxt/ui'],
  components: {
    dirs: [{ path: '~/components', pathPrefix: false }],
  },
  imports: {
    dirs: ['composables/**'],
  },
  nitro: {
    scheduledTasks: {
      '0 * * * *': ['processListens'],
    },
    experimental: {
      tasks: true,
    },
    ignore: ['**/*.test.ts', '**/*.integration.ts', '**/*.spec.ts'],
  },
});
