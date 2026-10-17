import { defineConfig } from 'vitest/config';

// Integration tests: supertest + PostgreSQL of tests. Files share one database, so run sequentially.
export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    passWithNoTests: true,
    fileParallelism: false,
    testTimeout: 15000,
  },
});
