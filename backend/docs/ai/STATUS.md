# STATUS — andamento do backend

Atualize este arquivo no fim de cada sessão de trabalho. A IA lê aqui qual é a etapa atual antes de começar.

**Etapa atual:** B05 (autenticação pronta e verificada; PR #7 aguarda revisão de outra pessoa). B02 concluída (banco em nuvem no Neon com as migrações aplicadas e README testado por Pedro e Lucas); B03 aguarda o print do merge bloqueado
**Branch:** `feature/B05-authentication` (a partir de `develop`; B01 a B04 já estão integradas)
**Último teste vermelho/verde:** 2026-10-20 · B05: `LoginUser`, `AuthenticateUser`, `GetCurrentUser`, `parseEnv`, providers (unitário) e `/auth/*`, `authenticate`/`authorize`, `/docs` e repositório (integração), todos verdes; 130 unitários e 104 de integração

Legenda: ⬜ pendente · 🟨 em andamento · ✅ pronta (critérios e DoD marcados, PR integrado em `develop`).

## Etapas

| Etapa | Nome | Depende de | Arquivo | Status | PR |
|---|---|---|---|---|---|
| B01 | Setup do projeto | G01 | 04 | ✅ integrada em `develop`;| #1 |
| B02 | Docker, PostgreSQL e Prisma | B01 | 04 | ✅ integrada em `develop`; banco em nuvem (Neon) com as migrações aplicadas | #2 |
| B03 | Pipeline de CI | B01, B02 | 04 | ✅ integrada em `develop`, ruleset ativo; falta o print do merge bloqueado e avisar Lucas e Pedro | #3 |
| B04 | Modelo de dados e seed | B02 | 04 | ✅ integrada em `develop`; | #6 |
| B05 | Autenticação | B04 | 04 | 🟨 PR aberto, revisado pelo `reviewer` sem bloqueantes; falta revisão de outra pessoa, o "Authorize" do Swagger no navegador e avisar Lucas ★ | #7 |
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
- 2026-10-19 · Dependências da B05 aprovadas: `jsonwebtoken` (JWT; já constava na lista de imports restritos), `express-rate-limit` (limite do login), `swagger-ui-express` (Swagger em `/docs`) e `yaml` (ler o `openapi.yaml`; antes só vinha por transitiva do vitest), mais `@types/jsonwebtoken` e `@types/swagger-ui-express` · evita código próprio de criptografia, contador e UI.
- 2026-10-19 · JWT em HS256, fixo nos dois lados (`sign` e `verify`), com `iat` e `exp` calculados pelo `IClock` injetado · o token não escolhe o algoritmo (nega `alg: none`) e o prazo é testável com `FakeClock`. `ITokenProvider.verify` devolve `null` para token inválido, adulterado ou expirado, em vez de lançar · negação é valor, quem decide o 401 é o use case.
- 2026-10-19 · O perfil e o `ativo` vêm do banco a cada requisição (`AuthenticateUser` recarrega o usuário), nunca do token · desativar a conta ou mudar o perfil vale na hora. Por isso cada rota protegida faz uma consulta a mais.
- 2026-10-19 · `authenticate` recusa com **401 `UNAUTHORIZED`** o token válido de usuário desativado ou apagado (e `GetCurrentUser` faz o mesmo se o usuário sumir) · o doc 04 diz só "recusado" e "para de funcionar na hora"; 401 é o que o app trata como sessão encerrada. O 403 `USUARIO_INATIVO` fica só no login (senha certa em conta inativa). A B15 passa `allowInactive`.
- 2026-10-19 · `authenticate` só aceita `Authorization: Bearer <token>`; qualquer outro esquema (por exemplo `Basic`) conta como sem token · evita aceitar o token por um caminho não previsto no contrato.
- 2026-10-19 · No login, e-mail inexistente compara a senha com um hash falso, gerado uma vez pelo próprio `IHashProvider` (mesmo custo do bcrypt) e guardado na memória do use case · iguala o tempo de resposta sem o use case conhecer bcrypt. A senha é conferida antes de `ativo`.
- 2026-10-19 · `JWT_EXPIRES_IN` aceita inteiro positivo + `s`, `m`, `h` ou `d` (`12h`) e o `parseEnv` o entrega em **segundos** (`env.JWT_EXPIRES_IN` é número) · o login devolve `expiresIn: 43200` sem conversão espalhada. `JWT_SECRET` exige 32 caracteres, e a mensagem de erro nunca repete o valor.
- 2026-10-19 · `JWT_SECRET=troque-este-segredo` no `.env.example` é curto de propósito (19 caracteres) · quem copia o arquivo sem editar recebe o erro de partida em vez de rodar com um segredo público. Em `vitest.int.config.ts` há um segredo descartável só de teste e `BCRYPT_COST=4`.
- 2026-10-19 · Limite do login: 5 por minuto por IP + e-mail em minúsculas (`LOGIN_MAX_PER_MINUTE`), contando **toda** tentativa (certa, errada ou inválida) · também freia adivinhar a senha de uma conta. O contador fica na memória do processo e é criado por app (`buildAuthRoutes()`), então cada teste começa zerado. Atrás de proxy (B10) é preciso configurar `trust proxy`, senão todos os clientes dividem o mesmo IP.
- 2026-10-19 · Swagger em `/docs` (raiz, fora de `/api/v1`), lendo o `openapi.yaml` (`src/main/openapi.ts`); o Dockerfile copia o `openapi.yaml` para a imagem e ele saiu do `.dockerignore` · o doc diz só "em /docs"; o `openapi.yaml` continua sendo a fonte do contrato. No `openapi.yaml`, `security: bearerAuth` vale para tudo e `/health` e `/auth/login` declaram `security: []` (botão "Authorize").
- 2026-10-19 · `authenticate` e `authorize` são importados de `src/main/middlewares.ts` (a fábrica `makeAuthenticate` fica em `infra/http`) · `main` pode importar os use cases; `infra` não ficaria acoplada ao container. `req.auth` é opcional no tipo; `authorize` lança 401 se for usado sem `authenticate`.
- 2026-10-19 · `IUserRepository` tem só `findById` e `findByEmail`; o `save` existe apenas no `InMemoryUserRepository` · a porta ganha `save` e o resto na B06.
- 2026-10-19 · Os erros do login (`CREDENCIAIS_INVALIDAS`, `USUARIO_INATIVO`) ficam em `useCases/Auth/authErrors.ts`; os genéricos (`UnauthorizedError`, `ForbiddenError`, `RateLimitedError`) em `shared/errors`.
- 2026-10-19 · Limitação conhecida: o bcrypt usa só os primeiros 72 **bytes** da senha, e o contrato limita 72 **caracteres** · uma senha com acentos acima de 72 bytes é truncada em silêncio (verificado com `bcryptjs`: o prefixo de 72 bytes também autentica). Não muda o contrato; vale para as senhas definidas na B06.
- 2026-10-19 · O 429 é gerado pelo `express-rate-limit` e passa pelo `errorHandler` (`RateLimitedError`), então segue o formato `{ error: { code, message } }`; o cabeçalho `Retry-After` vem do próprio limitador.
- 2026-10-20 · Correções da revisão independente da B05, cada uma em commit próprio e test-first: a chave do limitador usa no máximo 254 caracteres do e-mail (o limitador roda antes do zod e o corpo pode ter 100 kb); o hash falso do login não fica em cache se a geração falhar; `JwtTokenProvider.verify` recusa token sem `exp`; o 429 tem teste do `Retry-After`.
- 2026-10-20 · O 403 `USUARIO_INATIVO` do login usa a mensagem do contrato (doc 03, seção 4.4): "Seu cadastro está inativo. Procure a administração." · é o texto que o app mostra; o `openapi.yaml` traz o mesmo exemplo.
- 2026-10-25 · B02: banco de homologação no Neon (PostgreSQL, região `sa-east-1`, banco `neondb`); a string de conexão é segredo e fica fora do repositório · `db:deploy` aplicou as duas migrações existentes (`init` e `modelo_de_dados_v1`) e `migrate status` confirmou "up to date". Foi aplicado pela URL *pooled* (host `-pooler`) e funcionou; o README mantém a recomendação de usar a URL direta para migrar. Na nuvem só se roda `db:deploy`: nada de `db:seed`, `db:reset` nem `db:migrate`.
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
| 2026-10-25 | B02 | Pendência do banco em nuvem: projeto no Neon criado por Eduardo; seção "Banco em nuvem (Neon)" no README e comentário no `.env.example`; `npm run db:deploy` aplicou `init` e `modelo_de_dados_v1`, e `prisma migrate status` respondeu "Database schema is up to date!". Pedro e Lucas já testaram o README (informado por Eduardo) | Conferir `/health` com `db: up` apontando para o Neon e o primeiro acesso após a suspensão do banco (timeout de 2 s); a URL de homologação entra na B10 |
| 2026-10-19 | B05 | TDD de `LoginUser`, `AuthenticateUser` e `GetCurrentUser` com fakes; `parseEnv` com `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_COST` e `LOGIN_MAX_PER_MINUTE`; `BcryptHashProvider` e `JwtTokenProvider` (spec próprio, relógio injetado); `PrismaUserRepository`; middlewares `authenticate` e `authorize`; limite de tentativas; rotas `/auth/login` e `/auth/me`; Swagger em `/docs` e `openapi.yaml`; `openapi.yaml` na imagem. Mutações provaram os testes de expiresIn, mensagem única, normalização do e-mail, `allowInactive` e chave do limitador. Verificado no `docker compose`: login do admin do seed, `/auth/me`, 401, 429 na sexta tentativa e `/docs`. Revisão independente: sem bloqueantes; corrigidos a chave do limitador (254 caracteres), o hash falso em cache, o `exp` obrigatório, o `Retry-After` testado e a mensagem do `USUARIO_INATIVO`; 130 unitários e 104 de integração | `/close-step` (revisão e PR `[B05]`); conferir o botão "Authorize" do Swagger no navegador; avisar Lucas ★ (contrato publicado); B06 e B07 |
