# Backend — Controle de Acesso (ABP 2026-2)

API em Node.js + Express 5 + TypeScript (`strict`) que atende o app mobile (JWT) e o terminal de acesso (ESP32 ou simulador).

Contexto para quem usa IA e documentação técnica: [AGENTS.md](AGENTS.md) e [docs/ai/](docs/ai/).

## Pré-requisitos

- Node.js 22 ou superior (desenvolvido com Node 24)
- npm 10 ou superior
- Docker Desktop (ou Docker Engine + Compose v2), para subir API e banco com um comando

## Instalar

```bash
cd backend
npm ci
cp .env.example .env   # no PowerShell: Copy-Item .env.example .env
```

Variáveis do `.env`:

| Variável                                            | Padrão                  | Uso                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------- |
| `PORT`                                              | `3000`                  | porta HTTP                                |
| `NODE_ENV`                                          | `development`           | `development`, `test` ou `production`     |
| `CORS_ORIGINS`                                      | `http://localhost:8081` | origens permitidas, separadas por vírgula |
| `LOG_LEVEL`                                         | `info`                  | nível de log do pino                      |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `access`, —, `access`   | banco local do docker compose             |
| `DB_PORT`                                           | `5432`                  | porta do PostgreSQL no seu computador     |

O `.env` nunca vai para o Git nem para a imagem Docker. Troque a senha do exemplo no seu `.env`.

## Subir com Docker (API + PostgreSQL)

```bash
cd backend
cp .env.example .env         # se ainda não tiver
docker compose up --build -d
docker compose ps            # db "healthy" e api "running"
curl http://localhost:3000/api/v1/health
```

O que sobe:

- `db`: PostgreSQL 17 com os bancos `access` (desenvolvimento) e `access_test` (testes de integração), dados no volume `pgdata`.
- `api`: a imagem de produção do backend, que só inicia depois que o banco responde ao `healthcheck`.

Comandos úteis:

| Comando                                    | O que faz                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `docker compose logs -f api`               | acompanha os logs da API                                                    |
| `docker compose stop db`                   | para só o banco (a API continua de pé)                                      |
| `docker compose down`                      | para tudo e mantém os dados                                                 |
| `docker compose down -v`                   | para tudo e **apaga o banco**; na próxima subida o `access_test` é recriado |
| `docker compose exec db psql -U access -l` | lista os bancos                                                             |
| `docker compose exec api whoami`           | mostra o usuário da API (`node`, não root)                                  |

O script `docker/postgres/init/01-create-test-db.sql` só roda quando o volume está vazio. Se o volume foi criado antes dele, use `docker compose down -v`.

## Rodar sem Docker

```bash
npm run dev      # desenvolvimento, recarrega ao salvar
npm run build    # compila para dist/
npm start        # roda dist/main/server.js
```

A API fica em `http://localhost:3000/api/v1`. Para conferir se subiu:

```bash
curl http://localhost:3000/api/v1/health
# {"status":"ok","version":"0.1.0","time":"2026-10-16T12:00:00.000Z"}
```

Se faltar uma variável obrigatória (hoje, `CORS_ORIGINS`), o servidor não sobe e mostra qual é:

```text
Configuração inválida:
- CORS_ORIGINS: obrigatória
```

O contrato da API está em [openapi.yaml](openapi.yaml). Erros seguem sempre o formato
`{ "error": { "code", "message", "details?" } }`.

## Estrutura

Clean Architecture, um use case por pasta. Detalhes e regra de dependência em
[docs/ai/01-architecture.md](docs/ai/01-architecture.md).

```text
src/
  config/         variáveis de ambiente validadas (zod) e versão
  shared/errors/  AppError e subclasses
  entities/       entidades e regras puras
  repositories/   ports de repositório
  providers/      ports de serviços (IClock, ILogger, ...)
  useCases/       <Módulo>/<UseCase>/ com UseCase, Controller, DTO, spec e index
  infra/          implementações: http (middlewares), providers, database, repositories, jobs
  main/           container, app (sem listen), server (listen), routes
test/
  doubles/        fakes para testes unitários (FakeClock, ...)
  factories/      makeUser(), ...
  integration/    supertest
```

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

| Script       | O que faz                                |
| ------------ | ---------------------------------------- |
| `dev`        | `tsx watch src/main/server.ts`           |
| `build`      | `tsc` (specs ficam fora do `dist/`)      |
| `start`      | `node dist/main/server.js`               |
| `lint`       | `eslint .`                               |
| `typecheck`  | `tsc --noEmit` em `src` e `test`         |
| `format`     | `prettier --write .`                     |
| `test`       | `vitest run` (config `vitest.config.ts`) |
| `test:watch` | `vitest`                                 |
| `test:int`   | `vitest run -c vitest.int.config.ts`     |
| `test:cov`   | `vitest run --coverage`                  |
