// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: {
    host: '127.0.0.1',
    port: 3000,
  },
  runtimeConfig: {
    postgresUrl: process.env.POSTGRES_URL,
    spotifyAccessToken: process.env.SPOTIFY_ACCESS_TOKEN,
    public: {
      spotifyAccessToken: process.env.NUXT_PUBLIC_SPOTIFY_ACCESS_TOKEN,
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
  },
});
