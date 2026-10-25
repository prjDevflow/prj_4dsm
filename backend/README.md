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

**Antes de subir a API, defina o `JWT_SECRET` no `.env`** (mínimo 32 caracteres; o valor do exemplo é curto de
propósito e a API não sobe com ele). Gere um com `openssl rand -base64 48` (no PowerShell, qualquer texto
aleatório com 32 caracteres ou mais serve para desenvolvimento).

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
| `JWT_SECRET`                                        | — (obrigatória)         | segredo que assina os tokens, mínimo 32 caracteres      |
| `JWT_EXPIRES_IN`                                    | `12h`                   | validade do token: inteiro + `s`, `m`, `h` ou `d`       |
| `BCRYPT_COST`                                       | `10`                    | custo do bcrypt (4 a 15), na API e no seed              |
| `LOGIN_MAX_PER_MINUTE`                              | `5`                     | tentativas de login por minuto por IP e e-mail          |
| `SEED_*`                                            | ver `.env.example`      | credenciais e local do seed de desenvolvimento          |

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
docker compose run --rm seed      # dados de desenvolvimento: usuários, catraca, terminal (ver docs/ambiente-dev.md)
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
| `docker compose run --rm seed`    | semeia o banco do compose com os dados de desenvolvimento, só com Docker                 |
| `npm run db:reset`                | **apaga** o banco `access`, reaplica as migrações e semeia em seguida (pede confirmação) |
| `npm run db:seed`                 | roda `prisma/seed.ts` com as variáveis `SEED_*` do `.env`                                |
| `npm run db:erd`                  | regenera `docs/modelo-de-dados.md` (diagrama ER) a partir do `schema.prisma`             |
| `npm run db:generate`             | gera o client do Prisma em `src/generated/` (não versionado)                             |

Para que os testes de integração tenham as tabelas, aplique as migrações no banco de testes uma vez:

```bash
MIGRATE_DB=access_test docker compose run --rm migrate
```

Para recomeçar do zero, apagando tudo: `docker compose down -v && docker compose up -d && docker compose run --rm migrate && docker compose run --rm seed`.
O banco de testes volta vazio (`access_test`): migre-o de novo com `MIGRATE_DB=access_test docker compose run --rm migrate` antes do `npm run test:int`.

Os serviços `migrate` e `seed` usam imagens próprias (estágios do Dockerfile), não sobem com `docker compose up`
e se reconstroem a cada execução, para nunca aplicarem migrações velhas (`--quiet-build` silencia o log do build).

O seed é **idempotente** (pode rodar quantas vezes quiser) e cria o administrador, um condômino, um visitante,
um edifício, uma catraca, um terminal e uma autorização do visitante. As credenciais, o id e a chave do terminal
estão em [docs/ambiente-dev.md](docs/ambiente-dev.md) e são **só para desenvolvimento** (públicas). O seed se
recusa a rodar com `NODE_ENV=production`. O modelo de dados (9 tabelas) está em
[docs/modelo-de-dados.md](docs/modelo-de-dados.md).

### Banco em nuvem (Neon)

O banco de homologação é um PostgreSQL gerenciado no [Neon](https://neon.tech). A string de conexão é **segredo**:
nunca a coloque em arquivo versionado, em issue, em PR ou em log. Quem precisa dela pede ao responsável pelo backend.

O Neon entrega duas strings para o mesmo banco, e cada uma serve a um uso:

- **Direta** (host sem `-pooler`): use para **migrar** (`db:deploy`). O Prisma Migrate usa travas de sessão que o pooler pode não repassar. (A primeira migração da B02 também passou pela URL _pooled_, mas a direta é a opção segura.)
- **Pooled** (host com `-pooler`): use para a **API** rodando em homologação (B10), que abre várias conexões curtas.

As duas terminam com `?sslmode=require`. Para aplicar as migrações na nuvem, passe a URL direta só para esse comando,
sem gravá-la no `.env` (o `read -s` não mostra o que você digita nem guarda no histórico):

```bash
read -rs -p "DATABASE_URL direta do Neon: " NEON_URL; echo
DATABASE_URL="$NEON_URL" npm run db:deploy
DATABASE_URL="$NEON_URL" npx prisma migrate status   # deve dizer "Database schema is up to date!"
unset NEON_URL
```

**Não rode `db:seed`, `db:reset` nem `db:migrate` contra a nuvem.** O seed usa credenciais públicas (e se recusa com
`NODE_ENV=production`), e `reset` e `migrate dev` apagam ou alteram dados. Para a nuvem existe só `db:deploy`.

O plano gratuito do Neon suspende o banco quando fica ocioso; a primeira conexão depois disso demora mais.

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

Se faltar uma variável obrigatória (`CORS_ORIGINS`, `DATABASE_URL`, `JWT_SECRET`), o servidor não sobe e mostra qual é:

```text
Configuração inválida:
- JWT_SECRET: deve ter no mínimo 32 caracteres
```

O contrato da API está em [openapi.yaml](openapi.yaml). Erros seguem sempre o formato
`{ "error": { "code", "message", "details?" } }`.

## Autenticação e Swagger

O Swagger UI fica em **<http://localhost:3000/docs>** e lê o próprio `openapi.yaml`. Para testar uma rota protegida:
faça `POST /auth/login` com um usuário do seed (ver [docs/ambiente-dev.md](docs/ambiente-dev.md)), copie o
`accessToken`, clique em **Authorize** e cole só o token.

```bash
curl -X POST http://localhost:3000/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@dev.local","senha":"Admin-Dev-2026"}'
# {"accessToken":"eyJ...","tokenType":"Bearer","expiresIn":43200,"usuario":{...}}
curl http://localhost:3000/api/v1/auth/me -H "Authorization: Bearer <accessToken>"
```

- E-mail inexistente e senha errada dão o mesmo `401 CREDENCIAIS_INVALIDAS`. Conta inativa com a senha certa dá `403 USUARIO_INATIVO`.
- Token ausente, expirado, adulterado ou de usuário desativado dá `401 UNAUTHORIZED`. A cada requisição o usuário é recarregado do banco, então desativar uma conta ou mudar o perfil vale na hora.
- Mais de `LOGIN_MAX_PER_MINUTE` tentativas por minuto para o mesmo IP e e-mail dão `429 RATE_LIMITED`. O contador fica na memória do processo (um reinício o zera).
- Rotas protegidas usam `authenticate()` e `authorize('ADMIN', ...)` de `src/main/middlewares.ts`.

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
prisma/           schema.prisma, migrations/ (com os CHECK em SQL) e seed.ts
scripts/          ferramentas de desenvolvimento (gerador do diagrama ER)
test/
  doubles/        fakes para testes unitários (FakeClock, InMemoryUserRepository, FakeHashProvider, ...)
  factories/      makeUser(), makeAuthorization(), ...
  integration/    supertest + PostgreSQL (schema, seed, health, auth)
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

A regra de proteção está pronta em [`.github/rulesets/protecao-develop-main.json`](../.github/rulesets/protecao-develop-main.json)
(PR obrigatório, 1 aprovação, check `backend-ci` obrigatório, sem force-push nem exclusão). Quem é admin do
repositório a aplica em **Settings > Rules > Rulesets > New ruleset > Import a ruleset**.

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

| Script       | O que faz                                                                    |
| ------------ | ---------------------------------------------------------------------------- |
| `dev`        | `tsx watch src/main/server.ts`                                               |
| `build`      | `tsc` (specs ficam fora do `dist/`)                                          |
| `start`      | `node dist/main/server.js`                                                   |
| `lint`       | `eslint .`                                                                   |
| `typecheck`  | `tsc --noEmit` em `src` e `test`                                             |
| `format`     | `prettier --write .`                                                         |
| `test`       | `vitest run` (config `vitest.config.ts`)                                     |
| `test:watch` | `vitest`                                                                     |
| `test:int`   | `vitest run -c vitest.int.config.ts`                                         |
| `test:cov`   | `vitest run --coverage`                                                      |
| `db:*`       | Prisma: `generate`, `migrate`, `deploy`, `reset`, `seed`, e `erd` (diagrama) |
