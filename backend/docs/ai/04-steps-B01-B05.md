# 04 — Etapas B01 a B05: fundação e autenticação

Carregue este arquivo quando a etapa atual estiver entre B01 e B05. Antes de começar qualquer etapa, leia o fluxo TDD (`02-tdd-workflow.md`) e o DoD comum (seção 10 dele). Regras de negócio e contrato: `03-domain-and-contract.md`. Estrutura de pastas: `01-architecture.md`.

Como ler cada etapa:

- **Lista de testes** é o ponto de partida do TDD: vire cada item em `it.todo` e escreva o teste antes do código. **U** = unitário (doubles, sem banco), **I** = integração (supertest + PostgreSQL de testes).
- **Critérios de aceitação** e **Definição de pronto** são a verificação oficial da etapa: marque só com evidência.
- O DoD comum de `02` vale para todas as etapas, além do DoD próprio.

---

### B01 — Setup do projeto backend

- **Depende de:** G01 · **Libera:** B02 e todo o backend; Pedro (I04, via `/health`)
- **Prazo:** Sprint 1, **16/10** · **Prioridade:** 🔴
- **Objetivo:** servidor Express em TypeScript que sobe, responde `/health` e já tem a estrutura que as outras etapas usam.

**Ponto de partida:** copie o `node_server_template` para `backend/` (sem o `.git`) e aplique o roteiro de migração de `ANALISE-ESTRUTURA.md`. Isso substitui a árvore de pastas do plano antigo.

**Tarefas de configuração (não são TDD)**

- `package.json` com `express`, `zod`, `dotenv`, `pino`, `pino-http`, `helmet`, `cors`; dev: `typescript`, `tsx`, `vitest`, `@vitest/coverage-v8`, `supertest`, `eslint` (com a regra de fronteira de camadas), `prettier`, tipos.
- `tsconfig.json` com `"strict": true`, `rootDir: src`, `outDir: dist`.
- Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, `test:int`, `test:cov`.
- `.env.example` (`PORT`, `NODE_ENV`, `CORS_ORIGINS`, `LOG_LEVEL`) e `.gitignore` com `.env`.
- Estrutura de `01-architecture.md`: `main/app.ts` separado de `main/server.ts`; `shared/errors/AppError.ts`; `infra/http` com `requestId`, `errorHandler`, `notFound`; `config/env.ts`.
- README do backend: instalar, rodar, testar.

**Use case:** `Health/GetHealth` (retorna `status`, `version`, `time` pelo `IClock`).

**Lista de testes**

- [x] U `GetHealth`: deve devolver `status: "ok"`, a versão e a hora do relógio injetado.
- [x] U `parseEnv`: deve falhar com mensagem clara quando falta uma variável obrigatória.
- [x] U `parseEnv`: deve aplicar os padrões e converter números.
- [x] I `GET /api/v1/health`: 200 com o JSON esperado.
- [x] I rota inexistente: 404 no formato `{ error: { code: "NOT_FOUND", message } }`.
- [x] I erro lançado numa rota de teste: 500 `INTERNAL_ERROR` sem stack quando `NODE_ENV=production`.
- [x] I `AppError` lançado: usa o `status` e o `code` dele.
- [x] I JSON malformado no corpo: 422 `VALIDATION_ERROR`.

**Critérios de aceitação**

- [x] `npm run dev` sobe o servidor e `GET /api/v1/health` responde 200 com `{ "status": "ok", "version": "0.1.0", "time": "<ISO>" }`.
- [x] Uma rota inexistente responde 404 no formato padrão de erro.
- [x] Um erro lançado dentro de uma rota vira 500 no formato padrão, **sem** stack trace quando `NODE_ENV=production`.
- [x] Iniciar sem uma variável obrigatória faz o servidor falhar na partida com mensagem clara.
- [x] `npm run build` gera `dist/` e `npm start` roda a partir dele.

**Definição de pronto**

- [x] Teste de integração do `/health`, do 404 e do tratador de erros.
- [ ] README permite que alguém de fora rode o projeto em menos de 5 minutos.

---

### B02 — Docker, PostgreSQL e Prisma

- **Depende de:** B01 · **Libera:** B03, B04; banco em nuvem para todos
- **Prazo:** Sprint 1, **16/10** · **Prioridade:** 🔴 · **Requisitos:** RNF06, RP12

**Objetivo:** qualquer pessoa sobe API e banco com um comando; o banco em nuvem existe e está acessível.

**Tarefas**

- `backend/Dockerfile` multi-stage, usuário **não-root**, só `dist/` e dependências de produção na imagem final.
- `docker-compose.yml` com `api` e `db` (PostgreSQL), volume, `healthcheck` no banco e `depends_on` com condição de saúde. Crie também o banco `access_test` para os testes de integração (script de init).
- Prisma instalado; `prisma/schema.prisma` mínimo só para testar conexão e rodar a primeira migração.
- Scripts `db:migrate`, `db:deploy`, `db:seed`, `db:reset`.
- Banco em nuvem (Postgres gerenciado; **conferir os planos gratuitos vigentes**). String de conexão como segredo.
- Três ambientes de banco: local (compose), teste, nuvem (homologação).

**Use case:** `Health/GetHealth` passa a receber o port `IDatabaseProbe` (`ping(): Promise<boolean>`, em `providers/`) e devolve `db: "up"` ou `"down"`. Implementação: `SELECT 1` no Prisma.

**Lista de testes**

- [x] U `GetHealth`: com o probe respondendo, devolve `db: "up"`.
- [x] U `GetHealth`: com o probe falhando ou lançando erro, devolve `db: "down"` sem lançar exceção.
- [x] I `GET /health` contra o PostgreSQL de testes: `db: "up"`.
- [x] Verificação manual: parar o container do banco e conferir `db: "down"` com a API de pé.

**Critérios de aceitação**

- [x] `docker compose up` sobe API e banco; `GET /api/v1/health` mostra `"db": "up"`.
- [x] Parar o container do banco faz `/health` mostrar `"db": "down"` (e a API continua de pé).
- [x] A imagem não roda como root.
- [ ] A migração inicial roda no banco local **e** no banco em nuvem.
- [x] `DATABASE_URL` não aparece em nenhum arquivo versionado.

**Definição de pronto**

- [x] README explica como subir o ambiente e como resetar o banco.
- [ ] Pedro e Lucas conseguem rodar o backend local seguindo o README (peça para um deles testar).

---

### B03 — Pipeline de CI (build, lint e testes)

- **Depende de:** B01, B02 · **Libera:** B10 (CD); Lucas (F01) e Pedro (I03) usam como modelo
- **Prazo:** Sprint 1, **17/10** · **Prioridade:** 🔴 — ⚠️ **RP10 é eliminatória: sem testes automatizados no pipeline o projeto não é aceito**
- **Requisitos:** RNF08, RNF10, RNF12, RP09

**Objetivo:** todo commit e todo Pull Request passam por lint, build e testes automaticamente.

**Tarefas**

- `.github/workflows/ci.yml` em `push` e `pull_request`, filtro `backend/**`.
- Serviço PostgreSQL no job. Passos nomeados: instalar (cache) → lint (inclui a regra de fronteira de camadas) → typecheck e build → migrar o banco de teste → testes unitários com cobertura → testes de integração.
- Publicar o relatório de cobertura como artefato.
- Proteger `develop` e `main`: merge só por PR com CI verde e pelo menos uma aprovação.
- Selo (badge) no README; notificação de falha para o grupo.
- Provar o bloqueio: PR com teste quebrado de propósito → CI vermelho → merge bloqueado → corrigir. Guardar o print.

**Lista de verificação (não há use case; os testes já existem desde B01 e B02)**

- [x] Existem pelo menos 4 testes automatizados rodando no CI (os de B01 e B02).
- [ ] Um teste quebrado deixa o PR vermelho e o merge fica bloqueado.
- [x] O pipeline passa do zero, sem depender da sua máquina.
- [x] Lint com violação de fronteira (importar `infra` dentro de `useCases`) falha o CI.

**Critérios de aceitação**

- [x] Todo push dispara o pipeline.
- [ ] Falha em lint, build ou teste deixa o PR vermelho e impede o merge.
- [x] O pipeline passa do zero (sem depender de estado da sua máquina).
- [x] Há ao menos 4 testes automatizados executados no CI.
- [ ] O selo no README mostra o estado atual.

**Definição de pronto**

- [ ] Evidência (print) de um pipeline vermelho seguido de verde.
- [ ] Lucas e Pedro avisados de como adicionar o próprio job (arquivo separado ou job adicional com filtro de pasta).

---

### B04 — Modelo de dados v1 e seed

- **Depende de:** B02 · **Libera:** B05 em diante; Lucas (credenciais de dev); Pedro (terminal de dev)
- **Prazo:** Sprint 1, **17/10** · **Prioridade:** 🔴

**Objetivo:** criar todas as tabelas e os dados de desenvolvimento de uma vez; as etapas seguintes só consomem.

**Tarefas**

- Modelar no `schema.prisma` as tabelas da seção 7 de `03-domain-and-contract.md`. Os `CHECK` (usos e datas) entram como SQL na migração.
- Hash do token do QR e da chave do terminal; nunca o valor em claro.
- `prisma/seed.ts` exporta `runSeed(prisma, options)` (para ser testável) e é **idempotente** (`upsert`): 1 administrador (e-mail e senha de variáveis do seed), 1 condômino e 1 visitante de teste, 1 edifício, 1 catraca com coordenadas reais do local de testes, 1 terminal com **chave fixa de desenvolvimento**, 1 autorização válida para o visitante (vigente, 00:00 a 23:59, 100 usos).
- Documentar as credenciais de **desenvolvimento** em `docs/ambiente-dev.md`.

**Entidades e regras (TDD aqui)**

- Tipos de domínio em `src/entities` (strings literais, sem `@prisma/client`): `User`, `Building`, `AccessPoint`, `Terminal`, `Authorization`, `NfcTag`, `QrCredential`, `TerminalCommand`, `AccessEvent`.
- Regra pura `computeEffectiveStatus(authorization, now)` em `entities/rules`. Prioridade: `CANCELADA`, `EXPIRADA`, `ESGOTADA`, `ATIVA`.
- Helper `todayInSaoPaulo(now)` (data `YYYY-MM-DD` no fuso `America/Sao_Paulo`).

**Lista de testes**

- [x] U `computeEffectiveStatus`: `CANCELADA` vence qualquer outra situação.
- [x] U `computeEffectiveStatus`: último dia (`dataFim` igual a hoje) ainda é `ATIVA`; dia seguinte é `EXPIRADA`.
- [x] U `computeEffectiveStatus`: `usosRealizados` igual a `usosPermitidos` é `ESGOTADA`; um a menos é `ATIVA`.
- [x] U `computeEffectiveStatus`: expirada e esgotada ao mesmo tempo é `EXPIRADA`.
- [x] U `todayInSaoPaulo`: `2026-10-20T02:30:00Z` é dia 19 em São Paulo; `2026-10-20T03:00:00Z` é dia 20.
- [x] I migração aplicada a um banco vazio cria as tabelas e restrições esperadas.
- [x] I `runSeed` executado duas vezes não duplica registros nem falha.
- [x] I inserir dois usuários com o mesmo e-mail falha.
- [x] I inserir `usosRealizados` maior que `usosPermitidos` falha (CHECK).
- [x] I conferir no `schema.prisma` que nenhuma coluna guarda senha, token ou chave em texto puro (`senhaHash`, `apiKeyHash`, `tokenHash`).

**Critérios de aceitação**

- [x] Migração roda do zero e a estrutura bate com a tabela da seção 7 do arquivo 03.
- [x] `db:seed` pode ser executado duas vezes sem duplicar registros nem falhar.
- [x] Inserir dois usuários com o mesmo e-mail falha; inserir `usosRealizados > usosPermitidos` falha.
- [x] Nenhuma coluna guarda senha, token ou chave em texto puro.
- [x] Testes unitários de `computeEffectiveStatus` cobrem os quatro estados e os limites de data (último dia vale; dia seguinte não).

**Definição de pronto**

- [x] Diagrama ER gerado a partir do schema e salvo em `docs/`.
- [ ] Lucas e Pedro conseguem entrar com os usuários do seed (a partir da B05).

---

### B05 — Autenticação (RF07)

- **Depende de:** B04 · **Libera:** **F03 e F04 ★**; todas as rotas protegidas
- **Prazo:** Sprint 1, **18/10** · **Prioridade:** 🔴

**Objetivo:** login com e-mail e senha, token JWT, e rotas que sabem quem é o usuário e o perfil.

**Use cases e peças**

- `Auth/LoginUser`, `Auth/GetCurrentUser` (com Controller e DTO).
- `Auth/AuthenticateUser` (sem Controller; usado pelo middleware `authenticate({ allowInactive? })` em `infra/http`) e `authorize(...perfis)`.
- Ports: `IUserRepository` (`findByEmail`, `findById`), `IHashProvider`, `ITokenProvider`. Fakes: `InMemoryUserRepository`, `FakeHashProvider`, `FakeTokenProvider`.
- Limite de tentativas no login: 5 por minuto por combinação IP e e-mail → 429 `RATE_LIMITED` (middleware em `infra/http`).
- Swagger em `/docs` com `login` e `me` (primeiro contrato que o Lucas usa).

**Regras**

- Login: valida corpo (`email` até 254, formato válido; `senha` até 72 caracteres, limite do bcrypt), busca o e-mail em minúsculas, compara a senha.
- E-mail inexistente e senha errada devolvem a **mesma** resposta (401 `CREDENCIAIS_INVALIDAS`) e o tempo é parecido: compare com um hash falso quando o usuário não existe.
- Ordem: **primeiro a senha, depois `ativo`**. Senha certa em conta inativa → 403 `USUARIO_INATIVO`.
- JWT com `sub` (id), `perfil`, `iat`, `exp`. `JWT_SECRET` com no mínimo 32 caracteres (validado no `env.ts`). Validade `JWT_EXPIRES_IN`, padrão 12 h.
- `authenticate` lê `Authorization: Bearer`, valida assinatura e expiração e **recarrega o usuário no banco**; recusa inativo, a menos que `allowInactive` (usado na B15).

**Contrato**

| Rota | Corpo | Sucesso | Erros |
|---|---|---|---|
| `POST /auth/login` | `{ "email", "senha" }` | 200 `{ "accessToken", "tokenType": "Bearer", "expiresIn": 43200, "usuario": { "id", "nome", "email", "perfil" } }` | 422; 401 `CREDENCIAIS_INVALIDAS`; 403 `USUARIO_INATIVO`; 429 `RATE_LIMITED` |
| `GET /auth/me` | — | 200 `{ "id", "nome", "email", "perfil" }` | 401 `UNAUTHORIZED` |

**Lista de testes**

- [ ] U `LoginUser`: credenciais certas devolvem token e usuário sem `senhaHash`.
- [ ] U `LoginUser`: e-mail é normalizado para minúsculas antes da busca.
- [ ] U `LoginUser`: senha errada e e-mail inexistente lançam o mesmo `code` e a mesma mensagem.
- [ ] U `LoginUser`: e-mail inexistente ainda chama `compare` (hash falso), para igualar o tempo.
- [ ] U `LoginUser`: conta inativa com senha certa lança 403 `USUARIO_INATIVO`; com senha errada continua 401.
- [ ] U `AuthenticateUser`: token válido devolve o usuário recarregado do repositório.
- [ ] U `AuthenticateUser`: token expirado, adulterado ou malformado lança 401.
- [ ] U `AuthenticateUser`: usuário desativado depois da emissão do token é recusado.
- [ ] U `AuthenticateUser` com `allowInactive`: usuário inativo passa.
- [ ] U `GetCurrentUser`: devolve id, nome, e-mail e perfil.
- [ ] I `POST /auth/login`: 200, e a resposta não contém hash.
- [ ] I `POST /auth/login`: corpo inválido → 422 com `details` por campo.
- [ ] I rota protegida sem token → 401; com perfil errado → 403.
- [ ] I a sexta tentativa em um minuto → 429.
- [ ] I `GET /auth/me` com token válido → 200.
- [ ] I `/docs` responde e lista `login` e `me`.

**Critérios de aceitação**

- [ ] Credenciais corretas → 200 com token válido e dados do usuário, **sem** o hash da senha.
- [ ] Senha errada e e-mail inexistente → mesma resposta 401 e mesma mensagem.
- [ ] Usuário inativo com senha certa → 403 `USUARIO_INATIVO`.
- [ ] Token expirado, adulterado ou ausente → 401.
- [ ] Perfil sem permissão numa rota protegida → 403.
- [ ] A sexta tentativa em um minuto → 429.
- [ ] Desativar um usuário faz o token dele parar de funcionar na hora (porque `authenticate` consulta o banco).
- [ ] O Swagger permite fazer login e usar o token no botão "Authorize".

**Definição de pronto**

- [ ] Testes: sucesso, senha errada, e-mail inexistente, inativo, token expirado, token malformado, perfil errado, limite de tentativas.
- [ ] Lucas avisado de que o contrato está publicado (★).
