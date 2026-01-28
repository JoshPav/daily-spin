// https://nuxt.com/docs/api/configuration/nuxt-config

const testFiles = [
  '**/*.test.ts',
  '**/*.integration.ts',
  '**/*.component.ts',
  '**/*.spec.ts',
];

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ignore: testFiles,
  devServer: {
    host: '127.0.0.1',
    port: 3000,
  },
  runtimeConfig: {
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
    spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    baseUrl: process.env.BASE_URL,
    cronSecret: process.env.CRON_SECRET,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    vapidSubject: process.env.VAPID_SUBJECT,
    public: {
      spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    },
  },
  css: ['~/assets/css/main.css'],
  modules: [
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxt/test-utils/module',
    '@nuxtjs/device',
    '@vite-pwa/nuxt',
  ],
  pwa: {
    strategies: 'injectManifest',
    srcDir: 'service-worker',
    filename: 'sw.ts',
    registerType: 'autoUpdate',
    manifest: {
      name: 'DailySpin',
      short_name: 'DailySpin',
      description: 'Track your daily album listening history',
      theme_color: '#181818',
      background_color: '#181818',
      display: 'standalone',
      orientation: 'portrait',
      icons: [
        {
          src: '/icons/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icons/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: '/icons/pwa-maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  },
  components: {
    dirs: [{ path: '~/components', pathPrefix: false }],
  },
  imports: {
    dirs: ['composables/**'],
  },
  testUtils: {},
  vite: {
    build: {
      sourcemap: false,
    },
  },
  nitro: {
    scheduledTasks: {
      // Every hour
      '0 * * * *': ['processListens'],
      // Daily at 3 AM UTC
      '0 3 * * *': ['scheduleBacklogListens'],
      // Daily at 6 AM UTC
      '0 6 * * *': ['updateTodaysAlbumPlaylist'],
    },
    experimental: {
      tasks: true,
    },
    ignore: testFiles,
  },
});
