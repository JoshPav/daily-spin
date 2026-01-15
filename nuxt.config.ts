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
    baseUrl: process.env.BASE_URL,
    disableAutoFetch: process.env.DISABLE_AUTO_FETCH,
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
      // Every hour
      '0 * * * *': ['processListens'],
      // Daily at 3 AM UTC
      '0 3 * * *': ['scheduleBacklogListens'],
    },
    experimental: {
      tasks: true,
    },
    ignore: ['**/*.test.ts', '**/*.integration.ts', '**/*.spec.ts'],
  },
});
