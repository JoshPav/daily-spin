import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Load test environment variables
config({ path: '.env.test' });

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'happy-dom',
          include: ['**/*.test.ts'],
          exclude: ['**/*.integration.ts', 'node_modules/**'],
        },
      },
      {
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
