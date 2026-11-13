import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['server/tests/**/*.test.ts'],
    environment: 'node',
    globals: true,
    fileParallelism: false,
    testTimeout: 25000,
  },
});
