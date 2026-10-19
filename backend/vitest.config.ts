import { defineConfig } from 'vitest/config';

// Unit tests: no database, no network.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/entities/**', 'src/useCases/**'],
      exclude: ['**/index.ts', '**/*_DTO.ts', '**/*_Controller.ts'],
      thresholds: { lines: 80, branches: 75 },
    },
  },
});
