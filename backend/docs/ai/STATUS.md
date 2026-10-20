# STATUS — andamento do backend

Atualize este arquivo no fim de cada sessão de trabalho. A IA lê aqui qual é a etapa atual antes de começar.

**Etapa atual:** B04 (modelo de dados v1 e seed prontos e verificados; PR aguarda revisão de outro integrante). B02 aguarda o banco em nuvem e o teste do README por Pedro e Lucas; B03 aguarda o print do merge bloqueado
**Branch:** `feature/B04-data-model-seed` (a partir de `develop`; B01, B02 e B03 já estão integradas)
**Último teste vermelho/verde:** 2026-10-19 · entidades e regras (unitário), schema e seed (integração) e gerador do diagrama ER, todos verdes; 68 unitários e 78 de integração

Legenda: ⬜ pendente · 🟨 em andamento · ✅ pronta (critérios e DoD marcados, PR integrado em `develop`).

## Etapas

| Etapa | Nome | Depende de | Arquivo | Status | PR |
|---|---|---|---|---|---|
| B01 | Setup do projeto | G01 | 04 | ✅ integrada em `develop`;| #1 |
| B02 | Docker, PostgreSQL e Prisma | B01 | 04 | ✅ integrada em `develop`; falta banco em nuvem | #2 |
| B03 | Pipeline de CI | B01, B02 | 04 | ✅ integrada em `develop`, ruleset ativo; falta o print do merge bloqueado e avisar Lucas e Pedro | #3 |
| B04 | Modelo de dados e seed | B02 | 04 | ✅ integrada em `develop`; | #6 |
| B05 | Autenticação | B04 | 04 | ⬜ | |
| B06 | Usuários | B05 | 05 | ⬜ | |
| B07 | Locais e terminais | B05 | 05 | ⬜ | |
| B08 | Criar autorização | B06, B07 | 05 | ⬜ | |
| B09 | Consultar e cancelar autorizações | B08 | 05 | ⬜ | |
| B10 | Deploy e CD | B03, B05 | 05 | ⬜ | |
| B11 | Heartbeat e posição | B07 | 06 | ⬜ | |
| B12 | Emissão do QR | B07 | 06 | ⬜ | |
| B13 | Registro de eventos | B04 | 06 | ⬜ | |
| B14 | Canal de comandos | B04, B07 | 06 | ⬜ | |
| B15 | Validação por QR | B08, B11, B12, B13, B14 | 06 | ⬜ | |
| B16 | Tags NFC | B06, B07 | 07 | ⬜ | |
| B17 | Validação por NFC | B15, B16 | 07 | ⬜ | |
| B18 | Histórico de acessos | B13 | 07 | ⬜ | |
| B19 | Eventos offline | B13, B17 | 07 | ⬜ | |
| B20 | Segurança, monitoramento e docs | B18, B19 | 07 | ⬜ | |

## Marcos de integração (os três juntos)

| Marco | Quando | Precisa de |
|---|---|---|
| M1 Esqueleto andante | Review 1, 21/10 | B01 a B05 (B06 e B07 se der) |
| M2 Cadastros completos | Sprint 2, fim da semana 1 | B06 a B11 |
| M3 O QR gira e é lido | Sprint 2, semana 2 | B12 |
| M4 Acesso por QR ponta a ponta | Review 2, 11/11 | B13 a B15 |
| M5 Acesso por NFC | Sprint 3, semana 1 | B16, B17 |
| M6 Resiliência e histórico | Sprint 3, semana 2 | B18, B19 |
| M7 Ensaio final | Antes da apresentação final | tudo |

## Decisões registradas (ADR curto)

Formato: data · decisão · motivo.

- 2026-10-16 · Vitest como runner · menos configuração com TypeScript.
- 2026-10-16 · Setup da B01 criado do zero, sem o `node_server_template` · template e `ANALISE-ESTRUTURA.md` indisponíveis; docs 01 e 02 descrevem a estrutura.
- 2026-10-16 · TypeScript 6 com `module: NodeNext` em pacote CommonJS (imports relativos sem extensão) e `types: ["node"]` explícito (TS 6 não inclui `@types/*` automaticamente); sem `typeRoots` — `src/@types/*.d.ts` entra pelo `include`.
- 2026-10-16 · Árvore completa do doc 01 criada já na B01, com `.gitkeep` nas pastas sem código · pedido do autor; sobrepõe a regra "não criar pastas vazias" do doc 01 §7. Remover o `.gitkeep` quando a pasta ganhar código.
- 2026-10-16 · `CORS_ORIGINS` é obrigatória (sem padrão) · o doc 03 não define um valor padrão; origem errada em produção é pior que falhar na partida.
- 2026-10-16 · Corpo de erro 500 traz `stack` só fora de produção · facilita depurar em dev; o contrato vale em produção.
- 2026-10-16 · Specs fora do `tsconfig.json` (rootDir `src`); typecheck deles via `test/tsconfig.json` · specs importam `test/doubles`.
- 2026-10-16 · `parseEnv.ts` (puro, testado) separado de `env.ts` (carrega `.env` e encerra o processo) · teste unitário não depende do ambiente.
- 2026-10-16 · Log de requisições oculta `authorization`, `cookie` e `x-terminal-key` · regra 8 do AGENTS.md.
- 2026-10-16 · PostgreSQL 17 (`postgres:17-alpine`) no compose · versão madura e aceita pelos planos gratuitos de Postgres gerenciado; mesma versão no local e na nuvem.
- 2026-10-16 · `docker-compose.yml` em `backend/`, ao lado do Dockerfile · compartilha o `backend/.env` com o `npm run dev`.
- 2026-10-16 · Banco de testes `access_test` no mesmo container do banco local, criado por script de init · um só serviço para desenvolver e testar.
- 2026-10-16 · `init: true` no serviço `api` · repassa SIGTERM ao Node sem precisar de código de desligamento agora.
- 2026-10-16 · Estrutura de pastas do arquivo 01 substitui a árvore e o DoD de camadas do plano antigo · decisão do autor com base em `ANALISE-ESTRUTURA.md`.
- 2026-10-17 · Prisma 7.10.1 com `@prisma/adapter-pg` e `prisma.config.ts`; CLI e client fixados na mesma versão (o `npm install prisma` trouxe um 8.0.0-rc) · o 7 é a versão estável e o client e a CLI precisam coincidir.
- 2026-10-17 · Client gerado em `src/generated/prisma` (não versionado, gerado no build da imagem) · `tsc` o compila para `dist/`; a API não executa a CLI do Prisma (ela vem na imagem como peer opcional do `@prisma/client`, e `npm ci --omit=dev --omit=peer` não a remove).
- 2026-10-17 · `prisma.config.ts` lê `DATABASE_URL` sem exigir (string vazia) · `prisma generate` roda no build do Docker, que não tem banco; `migrate` falha com mensagem clara se faltar.
- 2026-10-17 · Primeira migração (`init`) cria só o model descartável `ConnectionCheck`; a B04 o remove · o Prisma não gera migração sem model.
- 2026-10-17 · Migrações pelo serviço `migrate` do compose (`docker compose run --rm migrate`; perfil `tools`, não sobe com `up`), com estágio `migrate` próprio no Dockerfile · quem só quer rodar o projeto precisa só de Docker, sem Node. Banco de testes: `MIGRATE_DB=access_test`. `npm run db:deploy` continua para o desenvolvimento e para o banco em nuvem.
- 2026-10-17 · `DATABASE_URL` é obrigatória no `env.ts`; o `/health` devolve `db: "down"` (HTTP 200) em cerca de 2 s quando o banco cai (timeout de conexão de 2 s) · a API não pode cair junto com o banco.
- 2026-10-17 · `onPoolError` e `onConnectionError` do adapter ligados ao `ILogger` · sem eles, parar o banco derrubaria o processo pelo evento `error` do pool.
- 2026-10-17 · `DB_PORT=5433` no `.env` local · a 5432 estava ocupada por outro PostgreSQL; `engines.node` subiu para `>=22.18` (exigência do Prisma 7).
- 2026-10-17 · Integração usa `access_test` (URL montada em `vitest.int.config.ts` a partir de `POSTGRES_*` e `DB_PORT`, ou `DATABASE_URL_TEST`); as migrações precisam ser aplicadas nele uma vez (README).
- 2026-10-17 · `ci.yml` com três jobs: `changes` (detecta `backend/**`), `backend` e `backend-ci` · o job de passagem `backend-ci` é o único check obrigatório e passa quando o backend não mudou; com filtro `paths` simples o merge de PRs de `mobile/` e `terminal/` ficaria preso em "pending".
- 2026-10-17 · CI em Node 24 e `ubuntu-24.04` · igual à imagem de produção; o `ubuntu-latest` migra para o Ubuntu 26 em 19/10/2026.
- 2026-10-17 · Banco do CI é um serviço `postgres:17-alpine` com senha descartável no próprio workflow · só existe dentro do job; não é segredo do projeto.
- 2026-10-17 · Cobertura: limiares do `vitest.config.ts` mantidos (80% linhas, 75% branches); relatório publicado como artefato `backend-coverage` · a medição atual cobre só o `GetHealth_UseCase` (100%).
- 2026-10-17 · Notificação de falha pelas notificações nativas do GitHub · sem secret nem serviço externo; Discord/Slack ficam para depois, se o grupo quiser.
- 2026-10-17 · Ruleset de `develop` e `main` versionado em `.github/rulesets/protecao-develop-main.json` · só a conta `prjDevflow` é admin; os integrantes têm `write` e não conseguem ligar a proteção.
- 2026-10-19 · Tipos do modelo v1: ids `uuid` (`@db.Uuid` com `@default(uuid())` do client), instantes `timestamptz(3)`, coordenadas `Float`, `dataInicio`/`dataFim` como `date`, `horaInicio`/`horaFim` como `varchar(5)` `HH:mm` com CHECK, enums do Prisma com os valores do contrato e `motivo` como `String` · códigos de negação novos não exigem migração; texto zero-padded permite comparar horas.
- 2026-10-19 · Todas as FKs são `ON DELETE RESTRICT` · registros se desativam com `ativo`, nunca se apagam.
- 2026-10-19 · CHECK em SQL no fim da migração, com nome `<tabela>_<regra>_chk`, inclusive o formato dos hashes (bcrypt `$2…`, SHA-256 em hexadecimal) · o banco recusa segredo em texto puro. O Prisma não enxerga CHECK: nunca recriar migrações com `db push`.
- 2026-10-19 · `bcryptjs` 3.0.3 no lugar de `bcrypt` · puro JS, mesmo hash; o módulo nativo não carrega com `npm ci --ignore-scripts` na imagem de produção. Entra na lista de imports restritos das camadas internas.
- 2026-10-19 · Seed idempotente com ids fixos (`5eed0000-…`): renova só `dataFim` da autorização (hoje + 365 dias), não zera usos, não reativa cancelada nem usuário desativado, e só regrava `senhaHash` se a senha do ambiente mudou.
- 2026-10-19 · Seed recusa `NODE_ENV=production` sem `SEED_ALLOW_PRODUCTION=true` · as credenciais de dev são públicas (estão no repositório e em `docs/ambiente-dev.md`). Senhas de exemplo sem `#`, que o `dotenv` lê como comentário.
- 2026-10-19 · `parseSeedEnv` separado do `env.ts` · a API não deve exigir credenciais de seed para subir.
- 2026-10-19 · Serviço `seed` no compose (como o `migrate`: perfil `tools`, `pull_policy: build`) · quem só quer rodar o projeto precisa só de Docker. Variáveis `SEED_*` com `${VAR:-}` para não quebrar o compose de quem não atualizou o `.env`.
- 2026-10-19 · Healthcheck do `db` por TCP (`-h 127.0.0.1`) · na primeira subida o Postgres roda um servidor temporário só no socket Unix durante o init, e o check por socket marcava `healthy` cedo demais (o `migrate` falhava com "dependency db failed to start").
- 2026-10-19 · Diagrama ER gerado por script próprio (`npm run db:erd`, `scripts/`) com teste que falha se `docs/modelo-de-dados.md` ficar desatualizado · sem dependência nova; `scripts/` entra no vitest e no typecheck dos testes e fica fora do build.
- 2026-10-19 · O Prisma 7 não semeia após `migrate reset` (sem `--skip-seed`), então `db:reset` chama `db:seed` em seguida. O `migrate reset` é bloqueado quando o Prisma detecta um agente de IA, a menos que a pessoa dê consentimento: o `db:reset` não foi executado pela IA e deve ser testado por um integrante.
- 2026-10-19 · `access_events` é somente inserção por convenção da aplicação · trigger de imutabilidade fica fora da B04.
- Pendente de registrar: requisição sem autenticação (401) na B15 não gera evento.

## Perguntas em aberto

| # | Pergunta | Para quem | Padrão adotado enquanto não responde |
|---|---|---|---|
| 1 | Regra dos 100 m: raio máximo ou mínimo? | Professor | Raio máximo de 100 m, configurável |
| 2 | Posição do terminal vem do GPS ou do cadastro? | Professor | `GPS_COM_FALLBACK` |
| 3 | Como a tag NFC é vinculada ao usuário? | Professor | Administrador vincula (UID digitado ou modo de cadastro) |
| 4 | A regra dos 100 m vale para NFC? | Professor | Não vale |
| 5 | Código HTTP para corpo acima de 64 kb em `/terminal/events/batch` | Lucas e Pedro (contrato) | 413 `PAYLOAD_TOO_LARGE` |
| 6 | Quais as coordenadas reais da catraca do local de testes? | Eduardo | `-23.30512, -45.96551` (exemplo do doc 03), trocáveis por `SEED_LATITUDE` e `SEED_LONGITUDE` |

## Registro de sessões

| Data | Etapa | O que foi feito | Próximo passo |
|---|---|---|---|
| 2026-10-16 | B01 | Configuração: package.json e dependências, tsconfig (build e test), ESLint com fronteira de camadas, Prettier, Vitest unit/int, `.env.example`, `.gitignore`, README | — |
| 2026-10-16 | B01 | Árvore de pastas do doc 01; TDD de `GetHealth`, `parseEnv` e integração (health, 404, 500, AppError, JSON malformado, ZodError); app, container, middlewares, `openapi.yaml` | Abrir PR `[B01]` para `develop`; pedir para alguém de fora testar o README (DoD); B02 |
| 2026-10-16 | B02 | Parte Docker: Dockerfile multi-stage não-root, `.dockerignore`, compose com `api` e `db` (healthcheck, volume, `access_test`), README. Estágio runtime simulado sem Docker (só deps de produção → health 200) | Rodar o roteiro de verificação Docker numa máquina com Docker; parte Prisma da B02 |
| 2026-10-17 | B02 | Docker verificado (db healthy antes da api, não-root, `access_test` criado no init, API de pé com o banco parado). Prisma 7: schema, `prisma.config.ts`, migração `init` aplicada em `access` e `access_test`, scripts `db:*`, `IDatabaseProbe` + `PrismaDatabaseProbe`, `db: up/down` no `/health` (TDD: unitário, integração, implementação), `DATABASE_URL` no env, Dockerfile gera o client, README e `openapi.yaml`. Stack recriada do zero com `down -v`: `up` → parar o db → `down` em cerca de 2 s → `up` de novo | Criar o banco em nuvem e aplicar `db:deploy` nele (precisa de conta e segredo); pedir a Pedro ou Lucas para testar o README; abrir o PR `[B02]`; B03 |
| 2026-10-17 | B03 | `.github/workflows/ci.yml` (changes, backend, backend-ci), ensaio local dos mesmos comandos, selo e seção de CI no README, ruleset de proteção versionado. Primeiro run verde em runner limpo (26 testes: 16 unitários + 10 de integração). Provas: teste quebrado deixa o `backend-ci` vermelho e volta a verde (PR #4); `useCase` importando `infra` falha o passo de lint (PR #5). Os dois PRs foram fechados sem merge | Admin da conta `prjDevflow` importa o ruleset; só então tirar o print do merge bloqueado; avisar Lucas e Pedro do padrão para o CI deles; integrar B01 → B02 → B03 retargetando a base para `develop`; B04 |
| 2026-10-19 | B04 | Entidades de domínio e regras puras (`computeEffectiveStatus`, `todayInSaoPaulo`) em TDD. Schema v1 com 9 tabelas, migração com 15 CHECK nomeados e 15 chaves estrangeiras, 53 testes de integração do schema (cada violação amarrada ao nome da restrição, com mutação provando que detectam a ausência). `runSeed` idempotente, `parseSeedEnv` com trava de produção, `docs/ambiente-dev.md`. Gerador do diagrama ER com teste de documento em dia. Seed e migrate pelo Docker, testados do zero. O teste do zero achou e corrigiu o healthcheck do db e a imagem velha do `migrate` | Outro integrante revisa e aprova o PR `[B04]`; troque as coordenadas pelas reais; um integrante roda `npm run db:reset` (a IA não pode); B05 |
