import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Load test environment variables
config({ path: '.env.test' });

const aliasConfig = {
  alias: [
    { find: /^~~/, replacement: fileURLToPath(new URL('./', import.meta.url)) },
    {
      find: /^~/,
      replacement: fileURLToPath(new URL('./', import.meta.url)),
    },
    {
      find: /^@\//,
      replacement: fileURLToPath(new URL('./', import.meta.url)),
    },
    {
      find: '#shared/schema',
      replacement: fileURLToPath(new URL('./shared/schema', import.meta.url)),
    },
  ],
};

export default defineConfig({
  plugins: [vue()],
  resolve: aliasConfig,
  optimizeDeps: {
    include: ['@faker-js/faker', '@vue/test-utils'],
  },
  server: {
    fs: {
      allow: [fileURLToPath(new URL('.', import.meta.url))],
    },
  },
  test: {
    globals: true,
    silent: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    projects: [
      {
        resolve: aliasConfig,
        test: {
          name: 'unit',
          environment: 'happy-dom',
          include: ['**/*.test.ts'],
          exclude: ['**/*.integration.ts', 'node_modules/**'],
        },
      },
      {
        resolve: aliasConfig,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['**/*.integration.ts'],
          exclude: ['node_modules/**'],
        },
      },
    ],
  },
});
