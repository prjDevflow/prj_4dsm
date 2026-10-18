# Backend — Controle de Acesso (ABP 2026-2)

[![Backend CI](https://github.com/prjDevflow/prj_4dsm/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/prjDevflow/prj_4dsm/actions/workflows/ci.yml)

API em Node.js + Express 5 + TypeScript (`strict`) que atende o app mobile (JWT) e o terminal de acesso (ESP32 ou simulador).

Contexto para quem usa IA e documentação técnica: [AGENTS.md](AGENTS.md) e [docs/ai/](docs/ai/).

## Pré-requisitos

**Só para rodar a API e o banco:**

- Docker Desktop (ou Docker Engine + Compose v2). Não precisa de Node nem de npm: a imagem da API traz o próprio Node 24.

**Para desenvolver e rodar os testes** (além do Docker, que fornece o banco):

- Node.js 22.18 ou superior (exigência do Prisma 7)
- npm 10 ou superior

## Instalar

```bash
cd backend
cp .env.example .env   # no PowerShell: Copy-Item .env.example .env (necessário também para o Docker)
npm ci                 # só para desenvolver e testar (precisa de Node)
```

Variáveis do `.env`:

| Variável                                            | Padrão                  | Uso                                                     |
| --------------------------------------------------- | ----------------------- | ------------------------------------------------------- |
| `PORT`                                              | `3000`                  | porta HTTP                                              |
| `NODE_ENV`                                          | `development`           | `development`, `test` ou `production`                   |
| `CORS_ORIGINS`                                      | `http://localhost:8081` | origens permitidas, separadas por vírgula               |
| `LOG_LEVEL`                                         | `info`                  | nível de log do pino                                    |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `access`, —, `access`   | banco local do docker compose                           |
| `DB_PORT`                                           | `5432`                  | porta do PostgreSQL no seu computador                   |
| `DATABASE_URL`                                      | —                       | conexão dos comandos `npm` (dev, testes) fora do Docker |

O `.env` nunca vai para o Git nem para a imagem Docker. Troque a senha do exemplo no seu `.env`.
A senha e a porta da `DATABASE_URL` precisam ser as mesmas de `POSTGRES_PASSWORD` e `DB_PORT`. Se a
porta 5432 já estiver ocupada no seu computador, use outra (ex.: `DB_PORT=5433` e `...@localhost:5433/access`).
Dentro do `docker compose` a API e as migrações recebem a URL do serviço `db` automaticamente; para
rodar só com Docker, basta ajustar `POSTGRES_PASSWORD` (e `DB_PORT`, se precisar).

Para desenvolver, depois do `npm ci`, gere o client do Prisma (os tipos usados pelo código):

```bash
npm run db:generate
```

## Subir com Docker (API + PostgreSQL)

```bash
cd backend
cp .env.example .env         # se ainda não tiver
docker compose up --build -d
docker compose run --rm migrate   # aplica as migrações, dentro do Docker (sem Node no seu computador)
docker compose ps            # db "healthy" e api "running"
curl http://localhost:3000/api/v1/health
# {"status":"ok","version":"0.1.0","time":"...","db":"up"}
```

Com o banco parado (`docker compose stop db`) o `/health` continua respondendo 200, com `"db":"down"`.

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

### Banco de dados (Prisma)

| Comando                           | O que faz                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `docker compose run --rm migrate` | aplica as migrações existentes no banco do compose, só com Docker                        |
| `npm run db:migrate`              | cria uma nova migração a partir do `prisma/schema.prisma` e aplica (desenvolvimento)     |
| `npm run db:deploy`               | aplica as migrações existentes usando a `DATABASE_URL` do `.env` (inclui banco na nuvem) |
| `npm run db:reset`                | **apaga** o banco `access`, reaplica as migrações e roda o seed                          |
| `npm run db:seed`                 | roda `prisma/seed.ts` (hoje vazio; o seed real é da etapa B04)                           |
| `npm run db:generate`             | gera o client do Prisma em `src/generated/` (não versionado)                             |

Para que os testes de integração tenham as tabelas, aplique as migrações no banco de testes uma vez:

```bash
MIGRATE_DB=access_test docker compose run --rm migrate
```

Para recomeçar do zero, apagando tudo: `docker compose down -v && docker compose up -d && docker compose run --rm migrate`.

O serviço `migrate` usa uma imagem própria (estágio `migrate` do Dockerfile) e não sobe com `docker compose up`.

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

## Integração contínua (CI)

O workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) ("Backend CI") roda em **todo push e
em todo pull request**. Quando `backend/**` mudou, ele executa, nesta ordem:

1. instalar dependências (`npm ci`, com cache) e gerar o client do Prisma;
2. lint (inclui a regra de fronteira de camadas) e typecheck;
3. build;
4. migrar o banco de teste (PostgreSQL 17 como serviço do job);
5. testes unitários com cobertura (mínimo 80% de linhas e 75% de branches), com o relatório publicado
   como artefato `backend-coverage` (aba **Actions** do run);
6. testes de integração.

O job final **`backend-ci`** é o único check a exigir na proteção de `develop` e `main`. Ele passa quando
o backend foi validado ou quando o PR não mexe no backend, então PRs só de `mobile/` ou `terminal/` não
ficam presos esperando um check que não rodou.

Para ser avisado quando um run falhar, ligue **GitHub > Settings > Notifications > Actions**.

Reproduzir o CI na sua máquina (com o banco do compose de pé e migrado):

```bash
npm run db:generate && npm run lint && npm run typecheck && npm run build
npm run test:cov && npm run test:int
```

**Adicionar o CI de outra parte do repositório (mobile, terminal):** não edite o `ci.yml`. Crie um arquivo
novo em `.github/workflows/` (ex.: `mobile-ci.yml`) com `name` próprio, rode em `push` e `pull_request`,
use o mesmo padrão de detecção de mudanças da sua pasta e termine com um job de passagem de nome único
(ex.: `mobile-ci`) para ser o check obrigatório da sua parte.

## Scripts

| Script       | O que faz                                                |
| ------------ | -------------------------------------------------------- |
| `dev`        | `tsx watch src/main/server.ts`                           |
| `build`      | `tsc` (specs ficam fora do `dist/`)                      |
| `start`      | `node dist/main/server.js`                               |
| `lint`       | `eslint .`                                               |
| `typecheck`  | `tsc --noEmit` em `src` e `test`                         |
| `format`     | `prettier --write .`                                     |
| `test`       | `vitest run` (config `vitest.config.ts`)                 |
| `test:watch` | `vitest`                                                 |
| `test:int`   | `vitest run -c vitest.int.config.ts`                     |
| `test:cov`   | `vitest run --coverage`                                  |
| `db:*`       | Prisma: `generate`, `migrate`, `deploy`, `reset`, `seed` |
