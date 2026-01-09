// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    postgresUrl: process.env.POSTGRES_URL,
    spotifyAccessToken: process.env.SPOTIFY_ACCESS_TOKEN,
    public: {
      spotifyAccessToken: process.env.NUXT_PUBLIC_SPOTIFY_ACCESS_TOKEN,
    },
  },

  modules: ['@nuxt/image'],

  imports: {
    dirs: ['composables/**'],
  },
});
