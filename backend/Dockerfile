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
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM base AS runtime
ENV NODE_ENV=production
# Files stay owned by root, so the app user can read but not modify them.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# version.ts reads the version from package.json.
COPY package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main/server.js"]
