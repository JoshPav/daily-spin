import { defineVitestConfig } from '@nuxt/test-utils/config';

export default defineVitestConfig({
  test: {
    name: 'component',
    environment: 'nuxt',
    include: ['**/*.component.ts'],
    exclude: ['node_modules/**', 'vitest.config.*.ts'],
    setupFiles: ['./tests/component.setup.ts'],
    globals: true,
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
  },
});
