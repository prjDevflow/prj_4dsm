import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Not required by `prisma generate` (Docker build has no database); migrate commands fail clearly without it.
    url: process.env.DATABASE_URL ?? '',
  },
});
