import { fileURLToPath } from 'node:url';
import { defineVitestProject } from '@nuxt/test-utils/config';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

const aliasConfig = {
  alias: [
    { find: /^~~/, replacement: fileURLToPath(new URL('./', import.meta.url)) },
    {
      find: /^~/,
      replacement: fileURLToPath(new URL('./app/', import.meta.url)),
    },
    {
      find: /^@\//,
      replacement: fileURLToPath(new URL('./app/', import.meta.url)),
    },
    {
      find: /#shared\//,
      replacement: fileURLToPath(new URL('./shared/', import.meta.url)),
    },
    {
      find: /#server\//,
      replacement: fileURLToPath(new URL('./server/', import.meta.url)),
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
          exclude: [
            '**/*.integration.ts',
            '**/*.component.ts',
            'node_modules/**',
          ],
        },
      },
      {
        resolve: aliasConfig,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['**/*.integration.ts'],
          exclude: ['node_modules/**'],
          setupFiles: ['./tests/integration.setup.ts'],
          fileParallelism: false,
        },
      },
      await defineVitestProject({
        test: {
          name: 'component',
          environment: 'nuxt',
          include: ['**/*.component.ts'],
          exclude: ['node_modules/**'],
          environmentOptions: {
            nuxt: {
              domEnvironment: 'happy-dom',
            },
          },
        },
      }),
    ],
  },
});
