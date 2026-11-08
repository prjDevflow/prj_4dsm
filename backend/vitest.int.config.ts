import 'dotenv/config';
import { defineConfig } from 'vitest/config';

// Same credentials as docker-compose.yml; the tests use the separate `access_test` database.
const { POSTGRES_USER = 'access', POSTGRES_PASSWORD = '', DB_PORT = '5432' } = process.env;
const testDatabaseUrl =
  process.env.DATABASE_URL_TEST ??
  `postgresql://${encodeURIComponent(POSTGRES_USER)}:${encodeURIComponent(POSTGRES_PASSWORD)}@localhost:${DB_PORT}/access_test`;

// Integration tests: supertest + PostgreSQL of tests. Files share one database, so run sequentially.
export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    passWithNoTests: true,
    fileParallelism: false,
    testTimeout: 15000,
    env: {
      NODE_ENV: 'test',
      CORS_ORIGINS: 'http://localhost:8081',
      LOG_LEVEL: 'silent',
      DATABASE_URL: testDatabaseUrl,
      // Throwaway value, only for the test database; not a secret.
      JWT_SECRET: 'segredo-somente-para-testes-de-integracao-0123456789',
      // Cheapest bcrypt cost, so the tests that hash passwords stay fast.
      BCRYPT_COST: '4',
      // Not the default (60): the enroll-mode test then fails if the wiring of the variable breaks.
      ENROLL_MODE_SECONDS: '45',
      // Not the default (3): the debounce test then fails if the wiring of the variable breaks.
      NFC_DEBOUNCE_SECONDS: '5',
    },
  },
});
