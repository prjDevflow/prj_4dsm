# STATUS — andamento do backend

Atualize este arquivo no fim de cada sessão de trabalho. A IA lê aqui qual é a etapa atual antes de começar.

**Etapa atual:** B02 (Docker e Prisma prontos e verificados; faltam o banco em nuvem e o teste do README por Pedro e Lucas)
**Branch:** `feature/B02-docker-prisma` (empilhada sobre `feature/B01-setup`)
**Último teste vermelho/verde:** 2026-10-17 · `GetHealth` com `db up/down` (unitário e integração, verde)

Legenda: ⬜ pendente · 🟨 em andamento · ✅ pronta (critérios e DoD marcados, PR integrado em `develop`).

## Etapas

| Etapa | Nome | Depende de | Arquivo | Status | PR |
|---|---|---|---|---|---|
| B01 | Setup do projeto | G01 | 04 | 🟨 em revisão | #1 |
| B02 | Docker, PostgreSQL e Prisma | B01 | 04 | 🟨 Docker e Prisma verificados localmente; falta banco em nuvem | |
| B03 | Pipeline de CI | B01, B02 | 04 | ⬜ | |
| B04 | Modelo de dados e seed | B02 | 04 | ⬜ | |
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
- 2026-10-17 · Client gerado em `src/generated/prisma` (não versionado, gerado no build da imagem) · `tsc` o compila para `dist/` e a imagem de produção não precisa da CLI do Prisma.
- 2026-10-17 · `prisma.config.ts` lê `DATABASE_URL` sem exigir (string vazia) · `prisma generate` roda no build do Docker, que não tem banco; `migrate` falha com mensagem clara se faltar.
- 2026-10-17 · Primeira migração (`init`) cria só o model descartável `ConnectionCheck`; a B04 o remove · o Prisma não gera migração sem model.
- 2026-10-17 · Migrações rodam do computador (`npm run db:deploy`), não dentro do container da API · a imagem de produção não leva a CLI do Prisma.
- 2026-10-17 · `DATABASE_URL` é obrigatória no `env.ts`; o `/health` devolve `db: "down"` (HTTP 200) em cerca de 2 s quando o banco cai (timeout de conexão de 2 s) · a API não pode cair junto com o banco.
- 2026-10-17 · `onPoolError` e `onConnectionError` do adapter ligados ao `ILogger` · sem eles, parar o banco derrubaria o processo pelo evento `error` do pool.
- 2026-10-17 · `DB_PORT=5433` no `.env` local · a 5432 estava ocupada por outro PostgreSQL; `engines.node` subiu para `>=22.18` (exigência do Prisma 7).
- 2026-10-17 · Integração usa `access_test` (URL montada em `vitest.int.config.ts` a partir de `POSTGRES_*` e `DB_PORT`, ou `DATABASE_URL_TEST`); as migrações precisam ser aplicadas nele uma vez (README).
- Pendente de registrar: requisição sem autenticação (401) na B15 não gera evento.

## Perguntas em aberto

| # | Pergunta | Para quem | Padrão adotado enquanto não responde |
|---|---|---|---|
| 1 | Regra dos 100 m: raio máximo ou mínimo? | Professor | Raio máximo de 100 m, configurável |
| 2 | Posição do terminal vem do GPS ou do cadastro? | Professor | `GPS_COM_FALLBACK` |
| 3 | Como a tag NFC é vinculada ao usuário? | Professor | Administrador vincula (UID digitado ou modo de cadastro) |
| 4 | A regra dos 100 m vale para NFC? | Professor | Não vale |
| 5 | Código HTTP para corpo acima de 64 kb em `/terminal/events/batch` | Lucas e Pedro (contrato) | 413 `PAYLOAD_TOO_LARGE` |

## Registro de sessões

| Data | Etapa | O que foi feito | Próximo passo |
|---|---|---|---|
| 2026-10-16 | B01 | Configuração: package.json e dependências, tsconfig (build e test), ESLint com fronteira de camadas, Prettier, Vitest unit/int, `.env.example`, `.gitignore`, README | — |
| 2026-10-16 | B01 | Árvore de pastas do doc 01; TDD de `GetHealth`, `parseEnv` e integração (health, 404, 500, AppError, JSON malformado, ZodError); app, container, middlewares, `openapi.yaml` | Abrir PR `[B01]` para `develop`; pedir para alguém de fora testar o README (DoD); B02 |
| 2026-10-16 | B02 | Parte Docker: Dockerfile multi-stage não-root, `.dockerignore`, compose com `api` e `db` (healthcheck, volume, `access_test`), README. Estágio runtime simulado sem Docker (só deps de produção → health 200) | Rodar o roteiro de verificação Docker numa máquina com Docker; parte Prisma da B02 |
| 2026-10-17 | B02 | Docker verificado (db healthy antes da api, não-root, `access_test` criado no init, API de pé com o banco parado). Prisma 7: schema, `prisma.config.ts`, migração `init` aplicada em `access` e `access_test`, scripts `db:*`, `IDatabaseProbe` + `PrismaDatabaseProbe`, `db: up/down` no `/health` (TDD: unitário, integração, implementação), `DATABASE_URL` no env, Dockerfile gera o client, README e `openapi.yaml`. Stack recriada do zero com `down -v`: `up` → parar o db → `down` em cerca de 2 s → `up` de novo | Criar o banco em nuvem e aplicar `db:deploy` nele (precisa de conta e segredo); pedir a Pedro ou Lucas para testar o README; abrir o PR `[B02]`; B03 |
