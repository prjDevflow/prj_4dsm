# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app

# All dependencies, to compile TypeScript.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
# The client is generated here (no database needed) and compiled into dist/ by tsc.
RUN npm run db:generate && npm run build

# Production dependencies only; no install scripts needed at runtime.
# npm still installs the Prisma CLI here (optional peer of @prisma/client); the API never runs it.
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# One-off image for `docker compose run --rm migrate`: the Prisma CLI plus the migrations, nothing else.
# Not part of the production image; `runtime` below stays the last stage.
FROM deps AS migrate
COPY prisma.config.ts ./
COPY prisma ./prisma
USER node
CMD ["node_modules/.bin/prisma", "migrate", "deploy"]

# One-off image for `docker compose run --rm seed`: the dev seed (tsx), the generated Prisma client and
# the few src/ files the seed imports. Development data only; never the production image.
FROM deps AS seed
COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npm run db:generate
USER node
CMD ["node_modules/.bin/tsx", "prisma/seed.ts"]

FROM base AS runtime
ENV NODE_ENV=production
# Files stay owned by root, so the app user can read but not modify them.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# version.ts reads the version from package.json; /docs serves openapi.yaml.
COPY package.json openapi.yaml ./
USER node
EXPOSE 3000
CMD ["node", "dist/main/server.js"]
