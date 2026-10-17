# Backend — Controle de Acesso (ABP 2026-2)

API em Node.js + Express 5 + TypeScript (`strict`) que atende o app mobile (JWT) e o terminal de acesso (ESP32 ou simulador).

Contexto para quem usa IA e documentação técnica: [AGENTS.md](AGENTS.md) e [docs/ai/](docs/ai/).

## Pré-requisitos

- Node.js 22 ou superior (desenvolvido com Node 24)
- npm 10 ou superior

## Instalar

```bash
cd backend
npm ci
cp .env.example .env   # no PowerShell: Copy-Item .env.example .env
```

Variáveis do `.env`:

| Variável       | Padrão                  | Uso                                       |
| -------------- | ----------------------- | ----------------------------------------- |
| `PORT`         | `3000`                  | porta HTTP                                |
| `NODE_ENV`     | `development`           | `development`, `test` ou `production`     |
| `CORS_ORIGINS` | `http://localhost:8081` | origens permitidas, separadas por vírgula |
| `LOG_LEVEL`    | `info`                  | nível de log do pino                      |

## Rodar

```bash
npm run dev      # desenvolvimento, recarrega ao salvar
npm run build    # compila para dist/
npm start        # roda dist/main/server.js
```

A API fica em `http://localhost:3000/api/v1` (saúde: `GET /api/v1/health`).

## Testar

```bash
npm test             # unitários (sem banco), rápidos
npm run test:watch   # unitários em modo watch (ciclo TDD)
npm run test:int     # integração (supertest + PostgreSQL de testes)
npm run test:cov     # unitários com cobertura (mínimo 80% linhas, 75% branches)
```

Unitários ficam ao lado do código (`src/**/*.spec.ts`); integração em `test/integration/**/*.test.ts`.

## Qualidade

```bash
npm run lint        # ESLint, inclui a regra de fronteira de camadas
npm run typecheck   # tsc sem emitir arquivos (src e test)
npm run format      # Prettier
```

Antes de abrir um PR: `typecheck`, `lint`, `test` e `test:int` precisam passar.

## Scripts

| Script       | O que faz                                   |
| ------------ | ------------------------------------------- |
| `dev`        | `tsx watch src/main/server.ts`              |
| `build`      | `tsc -p tsconfig.build.json` (exclui specs) |
| `start`      | `node dist/main/server.js`                  |
| `lint`       | `eslint .`                                  |
| `typecheck`  | `tsc --noEmit` em `src` e `test`            |
| `format`     | `prettier --write .`                        |
| `test`       | `vitest run` (config `vitest.config.ts`)    |
| `test:watch` | `vitest`                                    |
| `test:int`   | `vitest run -c vitest.int.config.ts`        |
| `test:cov`   | `vitest run --coverage`                     |
