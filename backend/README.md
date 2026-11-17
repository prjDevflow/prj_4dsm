<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:17364F,100:0A7C66&height=180&section=header&text=Passe%20%C2%B7%20API&fontSize=46&fontColor=ffffff&fontAlignY=38&desc=Backend%20do%20controle%20de%20acesso%20%7C%20ABP%202026-2&descAlignY=60&descSize=16&animation=fadeIn" width="100%" />

<br/>

[![Backend CI](https://github.com/prjDevflow/prj_4dsm/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/prjDevflow/prj_4dsm/actions/workflows/ci.yml)
[![Deploy em homologação](https://img.shields.io/github/deployments/prjDevflow/prj_4dsm/homologacao?label=homologa%C3%A7%C3%A3o)](https://github.com/prjDevflow/prj_4dsm/deployments/homologacao)
[![API no ar](https://img.shields.io/badge/API-homologa%C3%A7%C3%A3o-0A7C66?style=for-the-badge&logo=microsoftazure&logoColor=white)](https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/docs)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

</div>

---

## Sobre a API

> A API é o centro do **Passe**. Ela atende o app mobile e o terminal de acesso.

A API gera o QR Code de cada terminal. Ela valida cada tentativa de acesso, por QR Code ou por tag NFC. Ela consome os usos da autorização numa transação. Ela grava um evento por tentativa. Depois, ela manda o terminal abrir ou negar.

- **App mobile:** usa um token JWT.
- **Terminal de acesso** (ESP32 ou simulador): usa os cabeçalhos `X-Terminal-Id` e `X-Terminal-Key`.

Stack: Node.js, Express 5, TypeScript (`strict`), Prisma 7 e PostgreSQL 17.

Contexto para IA e documentação técnica: [AGENTS.md](AGENTS.md) e [docs/ai/](docs/ai/).

---

## API em homologação

A API de homologação está no ar desde 17/11/2026. Use esta API para testar o app e o terminal.

<div align="center">

| Recurso            | Endereço                                                                                                  |
| :----------------- | :-------------------------------------------------------------------------------------------------------- |
| Base da API        | `https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/api/v1`                        |
| Swagger (contrato) | [/docs](https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/docs)                   |
| Saúde              | [/api/v1/health](https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/api/v1/health) |
| Prontidão          | [/api/v1/ready](https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/api/v1/ready)   |

</div>

```bash
curl https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/api/v1/health
# {"status":"ok","version":"0.1.0","time":"...","db":"up"}
```

**Onde a API roda:**

- Azure Container Apps, região Chile Central, com 1 réplica sempre ligada.
- A imagem fica no GitHub Container Registry (`ghcr.io/prjdevflow/prj_4dsm/backend`).
- O banco é o PostgreSQL do Neon. A API usa a URL com pooler. As migrações usam a URL direta.
- O HTTPS é do Azure. A API confia em 1 proxy (`TRUST_PROXY=1`).

**Como uma versão nova chega à homologação:**

1. Faça o merge de um PR na `develop` que muda o `backend/`.
2. O CI roda. Se o `backend-ci` falha, o deploy não acontece.
3. Com o CI verde, o job `deploy` publica a imagem, aplica as migrações e troca a revisão.
4. O teste de fumaça chama o `/health` por HTTPS. Ele exige `db` igual a `up`.

**Para voltar a uma versão anterior:** abra **Actions → Backend CD → Run workflow**. Informe o SHA completo de uma imagem já publicada. Este caminho não gera imagem e não aplica migrações.

> [!IMPORTANT]
> Não rode o seed na homologação. As credenciais do seed são públicas. O primeiro administrador da homologação é uma decisão aberta (pergunta #19 do [STATUS](docs/ai/STATUS.md)).

> [!NOTE]
> O Neon gratuito suspende o banco quando ele fica parado. A primeira requisição depois disso demora mais.

Guia completo (Azure, OIDC, secrets, rollback, cadeia HTTPS para o terminal): [docs/deploy-azure.md](docs/deploy-azure.md).

---

## Começar

<details open>
<summary><b>Pré-requisitos</b></summary>
<br>

**Para rodar só a API e o banco:**

- Docker Desktop, ou Docker Engine com Compose v2.
- Não é necessário Node. A imagem da API tem o Node 24.

**Para desenvolver e rodar os testes** (o Docker fornece o banco):

- Node.js 22.18 ou superior. O Prisma 7 exige esta versão.
- npm 10 ou superior.

</details>

<details open>
<summary><b>Instalar</b></summary>
<br>

```bash
cd backend
cp .env.example .env   # no PowerShell: Copy-Item .env.example .env (também é necessário para o Docker)
npm ci                 # só para desenvolver e testar (precisa de Node)
```

**Defina o `JWT_SECRET` no `.env` antes de subir a API.** O mínimo é 32 caracteres. O valor do exemplo é curto de propósito, e a API não sobe com ele. Gere um valor com `openssl rand -base64 48`. No PowerShell, um texto aleatório com 32 caracteres ou mais serve para desenvolvimento.

Depois do `npm ci`, gere o client do Prisma. O código usa os tipos dele.

```bash
npm run db:generate
```

</details>

<details>
<summary><b>Variáveis do <code>.env</code></b></summary>
<br>

| Variável                                               | Padrão                  | Uso                                                        |
| ------------------------------------------------------ | ----------------------- | ---------------------------------------------------------- |
| `PORT`                                                 | `3000`                  | porta HTTP                                                 |
| `NODE_ENV`                                             | `development`           | `development`, `test` ou `production`                      |
| `CORS_ORIGINS`                                         | `http://localhost:8081` | origens permitidas, separadas por vírgula                  |
| `LOG_LEVEL`                                            | `info`                  | nível de log do pino                                       |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`    | `access`, —, `access`   | banco local do docker compose                              |
| `DB_PORT`                                              | `5432`                  | porta do PostgreSQL no seu computador                      |
| `DATABASE_URL`                                         | —                       | conexão dos comandos `npm` (dev, testes) fora do Docker    |
| `JWT_SECRET`                                           | — (obrigatória)         | segredo que assina os tokens, mínimo 32 caracteres         |
| `JWT_EXPIRES_IN`                                       | `12h`                   | validade do token: inteiro + `s`, `m`, `h` ou `d`          |
| `BCRYPT_COST`                                          | `10`                    | custo do bcrypt (4 a 15), na API e no seed                 |
| `LOGIN_MAX_PER_MINUTE`                                 | `5`                     | tentativas de login por minuto por IP e e-mail             |
| `TERMINAL_ONLINE_WINDOW_S`                             | `30`                    | segundos sem contato até o terminal aparecer offline       |
| `HEARTBEAT_MIN_INTERVAL_S`                             | `2`                     | segundos mínimos entre dois heartbeats do terminal         |
| `QR_REFRESH_MS`, `COMMAND_POLL_MS`, `OPEN_DURATION_MS` | `10000`, `1000`, `5000` | o que o heartbeat devolve ao terminal, em milissegundos    |
| `QR_TTL_SECONDS`, `QR_TOLERANCE_SECONDS`               | `10`, `5`               | validade do QR: o código vale a soma dos dois, em segundos |
| `QR_ISSUE_MIN_INTERVAL_S`                              | `5`                     | segundos mínimos entre dois QR do mesmo terminal           |
| `QR_PURGE_AFTER_HOURS`                                 | `1`                     | horas depois de vencer em que a credencial é apagada       |
| `COMMAND_TTL_SECONDS`                                  | `10`                    | segundos em que um comando ainda pode ser entregue         |
| `COMMAND_PURGE_AFTER_HOURS`                            | `1`                     | horas depois de vencer em que o comando é apagado          |
| `TERMINAL_POSITION_SOURCE`                             | `GPS_COM_FALLBACK`      | origem da posição na checagem de proximidade               |
| `GPS_MAX_AGE_MIN`                                      | `10`                    | idade máxima do GPS, em minutos, para ele valer            |
| `QR_VALIDATE_MAX_PER_MINUTE`                           | `10`                    | validações de QR por minuto por usuário (acima, 429)       |
| `MAX_DISTANCE_M`                                       | `100`                   | distância máxima, em metros, entre o celular e o terminal  |
| `ENROLL_MODE_SECONDS`                                  | `60`                    | segundos do modo de cadastro de tag NFC no terminal        |
| `NFC_DEBOUNCE_SECONDS`                                 | `3`                     | segundos em que a mesma tag repete a decisão no terminal   |
| `TERMINAL_MAX_PER_MINUTE`                              | `300`                   | requisições por minuto de cada terminal, em todas as rotas |
| `TERMINAL_AUTH_FAIL_MAX_PER_MINUTE`                    | `20`                    | falhas de autenticação do terminal por minuto e por IP     |
| `PUBLIC_MAX_PER_MINUTE`                                | `120`                   | requisições por minuto por IP em `/health` e `/ready`      |
| `TRUST_PROXY`                                          | `0`                     | proxies na frente da API (um número, nunca `true`)         |
| `SEED_*`                                               | ver `.env.example`      | credenciais e local do seed de desenvolvimento             |

- O `.env` nunca vai para o Git nem para a imagem Docker.
- Troque a senha do exemplo no seu `.env`.
- A senha e a porta da `DATABASE_URL` devem ser iguais a `POSTGRES_PASSWORD` e `DB_PORT`.
- Se a porta 5432 está ocupada, use outra. Exemplo: `DB_PORT=5433` e `...@localhost:5433/access`.
- Dentro do `docker compose`, a API e as migrações recebem a URL do serviço `db` automaticamente. Para usar só o Docker, ajuste `POSTGRES_PASSWORD` (e `DB_PORT`, se necessário).

</details>

---

## Subir com Docker

```bash
cd backend
cp .env.example .env              # se ainda não tem
docker compose up --build -d
docker compose run --rm migrate   # aplica as migrações dentro do Docker (sem Node no seu computador)
docker compose run --rm seed      # dados de desenvolvimento: usuários, catraca, terminal (ver docs/ambiente-dev.md)
docker compose ps                 # db "healthy" e api "running"
curl http://localhost:3000/api/v1/health
# {"status":"ok","version":"0.1.0","time":"...","db":"up"}
```

Com o banco parado (`docker compose stop db`), o `/health` ainda responde 200, com `"db":"down"`. O `/ready` responde **503**. Use o `/ready` para alertas (ver [Segurança e monitoramento](#segurança-e-monitoramento)).

```bash
curl -i http://localhost:3000/api/v1/ready
# 200 {"status":"ready","db":"up","time":"..."}  |  503 {"status":"unavailable","db":"down","time":"..."}
```

**Serviços:**

- `db`: PostgreSQL 17 com os bancos `access` (desenvolvimento) e `access_test` (testes de integração). Os dados ficam no volume `pgdata`.
- `api`: a imagem de produção do backend. Ela inicia só depois que o banco passa no `healthcheck`.

<details>
<summary><b>Comandos úteis do Docker</b></summary>
<br>

| Comando                                    | O que faz                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `docker compose logs -f api`               | mostra os logs da API                                                       |
| `docker compose stop db`                   | para só o banco (a API continua de pé)                                      |
| `docker compose down`                      | para tudo e mantém os dados                                                 |
| `docker compose down -v`                   | para tudo e **apaga o banco**; na próxima subida o `access_test` é recriado |
| `docker compose exec db psql -U access -l` | lista os bancos                                                             |
| `docker compose exec api whoami`           | mostra o usuário da API (`node`, não root)                                  |

O script `docker/postgres/init/01-create-test-db.sql` roda só com o volume vazio. Se o volume é mais antigo que o script, use `docker compose down -v`.

</details>

### Banco de dados (Prisma)

| Comando                           | O que faz                                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `docker compose run --rm migrate` | aplica as migrações existentes no banco do compose, só com Docker                                  |
| `npm run db:migrate`              | cria uma migração nova a partir do `prisma/schema.prisma` e aplica (desenvolvimento)               |
| `npm run db:deploy`               | aplica as migrações existentes com a `DATABASE_URL` do `.env` (também banco na nuvem)              |
| `docker compose run --rm seed`    | semeia o banco do compose com os dados de desenvolvimento, só com Docker                           |
| `npm run db:reset`                | **apaga** o banco `access`, aplica as migrações de novo e semeia (pede confirmação)                |
| `npm run db:seed`                 | roda `prisma/seed.ts` com as variáveis `SEED_*` do `.env`                                          |
| `npm run db:erd`                  | gera de novo `docs/modelo-de-dados.md` (diagrama ER) a partir do `schema.prisma`                   |
| `npm run db:generate`             | gera o client do Prisma em `src/generated/` (fora do Git)                                          |
| `npm run dev:qr`                  | emite um QR para o terminal de desenvolvimento e mostra o `payload` (recusa `NODE_ENV=production`) |

Aplique as migrações no banco de testes uma vez. Os testes de integração precisam das tabelas.

```bash
MIGRATE_DB=access_test docker compose run --rm migrate
```

Para começar do zero e apagar tudo: `docker compose down -v && docker compose up -d && docker compose run --rm migrate && docker compose run --rm seed`. O banco `access_test` volta vazio. Migre-o de novo com `MIGRATE_DB=access_test docker compose run --rm migrate` antes do `npm run test:int`.

- Os serviços `migrate` e `seed` usam imagens próprias (estágios do Dockerfile).
- Eles não sobem com `docker compose up`.
- Eles fazem o build a cada execução. Assim, nunca aplicam migrações velhas. O `--quiet-build` silencia o log do build.

**O seed é idempotente.** Você pode rodá-lo muitas vezes. Ele cria o administrador, um condômino, um visitante, um edifício, uma catraca, um terminal e uma autorização do visitante.

- As credenciais, o id e a chave do terminal estão em [docs/ambiente-dev.md](docs/ambiente-dev.md).
- Estes dados são **só para desenvolvimento**. Eles são públicos.
- O seed recusa `NODE_ENV=production`.
- O modelo de dados (9 tabelas) está em [docs/modelo-de-dados.md](docs/modelo-de-dados.md).

### Banco em nuvem (Neon)

O banco de homologação é um PostgreSQL gerenciado no [Neon](https://neon.tech). **A string de conexão é segredo.** Não a coloque em arquivo versionado, issue, PR ou log. Peça a string ao responsável pelo backend.

O Neon fornece duas strings para o mesmo banco. Cada uma tem um uso:

- **Direta** (host sem `-pooler`): use para **migrar** (`db:deploy`). O Prisma Migrate usa travas de sessão. O pooler pode não passar estas travas.
- **Pooled** (host com `-pooler`): use para a **API** em homologação. A API abre muitas conexões curtas.

As duas têm `sslmode=require`. Para migrar a nuvem, passe a URL direta só para o comando. Não grave a URL no `.env`. O `read -s` não mostra o texto e não grava no histórico. Ele é do bash; no zsh e no PowerShell, o comando é diferente.

```bash
read -rs -p "DATABASE_URL direta do Neon: " NEON_URL; echo
DATABASE_URL="$NEON_URL" npm run db:deploy
DATABASE_URL="$NEON_URL" npx prisma migrate status   # deve dizer "Database schema is up to date!"
unset NEON_URL
```

> [!WARNING]
> **Não rode `db:seed`, `db:reset` nem `db:migrate` na nuvem.** O seed usa credenciais públicas. Ele só recusa `NODE_ENV=production`. Sem esta variável, a trava não protege. O `reset` e o `migrate dev` apagam ou alteram dados. Na nuvem, use só o `db:deploy`. O CD já faz isso a cada deploy.

O Neon gratuito suspende o banco quando ele fica parado. A primeira conexão depois disso demora mais.

---

## Rodar sem Docker

```bash
npm run dev      # desenvolvimento, recarrega ao salvar
npm run build    # compila para dist/
npm start        # roda dist/main/server.js
```

A API fica em `http://localhost:3000/api/v1`. Para verificar:

```bash
curl http://localhost:3000/api/v1/health
# {"status":"ok","version":"0.1.0","time":"2026-10-16T12:00:00.000Z"}
```

Se falta uma variável obrigatória (`CORS_ORIGINS`, `DATABASE_URL`, `JWT_SECRET`), o servidor não sobe. Ele mostra o nome da variável:

```text
Configuração inválida:
- JWT_SECRET: deve ter no mínimo 32 caracteres
```

O servidor para de forma ordenada com `SIGTERM` ou `SIGINT`. Ele para os jobs, termina as requisições abertas e fecha o banco. O prazo é 20 s.

O contrato da API está em [openapi.yaml](openapi.yaml). Todo erro tem o formato `{ "error": { "code", "message", "details?" } }`.

---

## Rotas da API

O Swagger mostra o contrato completo, com exemplos. Localmente, ele fica em **<http://localhost:3000/docs>**. Na homologação, ele fica em [/docs](https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/docs). As seções abaixo resumem cada grupo de rotas.

<details>
<summary><b>Autenticação e Swagger</b></summary>
<br>

Para testar uma rota protegida no Swagger:

1. Faça `POST /auth/login` com um usuário do seed (ver [docs/ambiente-dev.md](docs/ambiente-dev.md)).
2. Copie o `accessToken`.
3. Clique em **Authorize**.
4. Cole só o token.

```bash
curl -X POST http://localhost:3000/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@dev.local","senha":"Admin-Dev-2026"}'
# {"accessToken":"eyJ...","tokenType":"Bearer","expiresIn":43200,"usuario":{...}}
curl http://localhost:3000/api/v1/auth/me -H "Authorization: Bearer <accessToken>"
```

- E-mail inexistente e senha errada dão o mesmo `401 CREDENCIAIS_INVALIDAS`. Conta inativa com a senha certa dá `403 USUARIO_INATIVO`.
- Token ausente, expirado, alterado ou de usuário desativado dá `401 UNAUTHORIZED`.
- A API lê o usuário do banco a cada requisição. Assim, desativar uma conta ou mudar o perfil tem efeito imediato.
- Mais de `LOGIN_MAX_PER_MINUTE` tentativas por minuto, para o mesmo IP e e-mail, dão `429 RATE_LIMITED`. O contador fica na memória do processo. Um reinício zera o contador.
- Rotas protegidas usam `authenticate()` e `authorize('ADMIN', ...)` de `src/main/middlewares.ts`.

</details>

<details>
<summary><b>Locais e terminais</b></summary>
<br>

Só `ADMIN` (rotas em `/buildings`, `/access-points` e `/terminals`).

- A API não apaga nada. Para desativar, use `PATCH` com `ativo: false`.
- Desativar um **ponto de acesso** com autorização ativa e não expirada dá `409 LOCAL_COM_AUTORIZACOES_ATIVAS`.
- Desativar um **edifício** faz o mesmo teste nos pontos dele. Se o teste passa, a API desativa todos os pontos. Reativar o edifício não reativa os pontos.
- `POST /terminals` e `POST /terminals/{id}/rotate-key` devolvem a `apiKey` **uma única vez**. O banco guarda só o SHA-256. O `rotate-key` invalida a chave antiga imediatamente.
- O terminal envia os cabeçalhos `X-Terminal-Id` e `X-Terminal-Key` (middleware `authenticateTerminal`, em `src/main/middlewares.ts`). Chave errada ou ausente dá `401`. Terminal inativo dá `403`. O log oculta a chave.
- Para testar, use o terminal do seed em [docs/ambiente-dev.md](docs/ambiente-dev.md).

</details>

<details>
<summary><b>Canal do terminal (heartbeat e QR)</b></summary>
<br>

O terminal chama estas rotas com os cabeçalhos `X-Terminal-Id` e `X-Terminal-Key`.

| Rota                       | O que faz                                                                       |
| -------------------------- | ------------------------------------------------------------------------------- |
| `POST /terminal/heartbeat` | informa que o terminal está vivo e onde está; devolve `serverTime` e `config`   |
| `POST /terminal/qr`        | emite o QR Code do terminal: `payload`, `emitidoEm`, `expiraEm` e `renovarEmMs` |

```bash
curl -X POST http://localhost:3000/api/v1/terminal/heartbeat \
  -H 'X-Terminal-Id: 5eed0000-0000-4000-8000-000000000006' \
  -H 'X-Terminal-Key: terminal-dev-key-1234567890abcdef1234567890' -H 'content-type: application/json' \
  -d '{"latitude":-23.30512,"longitude":-45.96551,"gpsFix":true,"gpsSimulado":false,"firmware":"0.3.0","wifiRssi":-61}'
```

**Heartbeat:**

- O instante do contato é o relógio do servidor.
- Depois do heartbeat, `GET /terminals` mostra o terminal `online`, com posição e hora do contato. "Online" é um contato com menos de `TERMINAL_ONLINE_WINDOW_S`.
- Com `gpsFix: false`, a API ignora a latitude e a longitude e mantém a última posição. Com `gpsFix: true`, elas são obrigatórias (`422`).
- `wifiRssi` é gravado como `rssi`. A API aceita `uptimeS` e `eventosPendentes`, mas não os grava.
- O máximo é um heartbeat a cada `HEARTBEAT_MIN_INTERVAL_S` por terminal. Antes disso, a resposta é `429 RATE_LIMITED`, e nada é gravado. A checagem é um `UPDATE` condicional. Assim, heartbeats simultâneos não passam todos.
- O `config` (`qrRefreshMs`, `commandPollMs`, `aberturaMs`) vem do ambiente do servidor. Com ele, você ajusta o terminal sem programá-lo de novo.

**QR Code:** `POST /terminal/qr` (sem corpo) devolve o texto que o terminal mostra como QR Code.

```bash
curl -X POST http://localhost:3000/api/v1/terminal/qr \
  -H 'X-Terminal-Id: 5eed0000-0000-4000-8000-000000000006' \
  -H 'X-Terminal-Key: terminal-dev-key-1234567890abcdef1234567890'
# {"payload":"ACS1:q3F8k2Zr1pLw9XbTn0YhVA","emitidoEm":"...","expiraEm":"...","renovarEmMs":10000}
```

- O token tem 16 bytes aleatórios (22 caracteres em base64url). O banco guarda só o SHA-256.
- O QR vale `QR_TTL_SECONDS` + `QR_TOLERANCE_SECONDS` (15 s) e é de uso único.
- O QR anterior continua válido até expirar. Assim, dois QRs valem juntos por poucos segundos. Isto é intencional.
- O máximo é um QR a cada `QR_ISSUE_MIN_INTERVAL_S` por terminal. Antes disso, a resposta é `429 RATE_LIMITED`.
- A verificação e a gravação ficam numa transação com trava por terminal (`pg_advisory_xact_lock`). Assim, pedidos simultâneos emitem um só QR.
- Um job apaga a cada minuto as credenciais vencidas há mais de `QR_PURGE_AFTER_HOURS`. O job inicia em `server.ts`, nunca em `app.ts`.
- Sem terminal físico, use `npm run dev:qr`. Ele emite um QR para o terminal do seed e mostra o `payload` (ver [docs/ambiente-dev.md](docs/ambiente-dev.md)).

</details>

<details>
<summary><b>Validação de acesso por QR</b></summary>
<br>

O app chama `POST /access/qr/validate` depois de ler o QR Code do terminal. A rota exige o token do usuário. Qualquer perfil pode chamar, também uma conta inativa, para a tentativa ficar registrada. O Swagger tem um exemplo de cada motivo de negação.

```bash
curl -X POST http://localhost:3000/api/v1/access/qr/validate \
  -H "Authorization: Bearer <accessToken>" -H 'content-type: application/json' \
  -d '{"payload":"ACS1:q3F8k2Zr1pLw9XbTn0YhVA","latitude":-23.30512,"longitude":-45.96551,"precisaoMetros":12.5}'
# 200 {"resultado":"AUTORIZADO","mensagem":"Acesso autorizado. Pode passar.","local":{"nome":"Catraca Social"},"usosRestantes":2,"distanciaM":14,"ocorridoEm":"2026-10-20T14:32:07Z"}
# 403 {"error":{"code":"DISTANTE_DO_TERMINAL","message":"Você está longe da catraca. Aproxime-se e tente de novo."}}
```

- As 11 verificações seguem a ordem da seção 5.1 do contrato. A primeira que falha define o motivo (`403`, com o código em `error.code`).
- Um `payload` fora do padrão (`ACS1:` mais 22 caracteres) dá `422`. Coordenadas fora da faixa também dão `422`. Coordenadas ausentes dão `LOCALIZACAO_INVALIDA`. Sem token, a resposta é `401`, e não há evento.
- **Toda tentativa grava exatamente um evento**, aprovada ou negada.
- Na aprovação, uma única transação:
  1. consome a credencial (`consumidoEm IS NULL`);
  2. consome um uso (`situacao = 'ATIVA'` e `usosRealizados < usosPermitidos`);
  3. grava o evento;
  4. cria o comando `ABRIR`.

  Se o evento falha, nada é consumido, e a resposta é `500`.

- Na negação, a API grava o evento e o comando `NEGAR`. O QR **não** é consumido.
- Duas leituras simultâneas do mesmo QR aprovam só uma. Dois QRs com um uso restante também aprovam só um. A outra leitura recebe `CREDENCIAL_REUTILIZADA` ou `USOS_ESGOTADOS`. Os testes provam isso contra o PostgreSQL real.
- A distância é medida até a posição do terminal (`TERMINAL_POSITION_SOURCE`): o GPS recente do heartbeat ou as coordenadas do ponto. O limite é `MAX_DISTANCE_M` (100 m), incluído.
- O máximo é `QR_VALIDATE_MAX_PER_MINUTE` validações por minuto por usuário. As seguintes dão `429`.
- Roteiro de teste com o `dev:qr`: [docs/ambiente-dev.md](docs/ambiente-dev.md).

</details>

<details>
<summary><b>Tags NFC</b></summary>
<br>

Só `ADMIN`. O administrador vincula a tag a um usuário de duas formas: ele digita o UID, ou ele liga o modo de cadastro no terminal e aproxima a tag. A leitura da tag é `POST /terminal/nfc`, que o terminal chama (subseção seguinte).

| Rota                                                     | O que faz                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `POST /nfc-tags` (`usuarioId`, `uid`, `descricao?`)      | vincula a tag a um usuário (`201`)                                              |
| `GET /nfc-tags` (filtros `usuarioId`, `ativa`; paginada) | lista da mais nova para a mais antiga                                           |
| `PATCH /nfc-tags/{id}` (`ativa`)                         | ativa ou desativa a tag; não existe `DELETE`                                    |
| `POST /terminals/{id}/enroll-mode` (`usuarioId`)         | liga o modo de cadastro por `ENROLL_MODE_SECONDS` (60 s) e devolve o `expiraEm` |

```bash
curl -X POST http://localhost:3000/api/v1/nfc-tags \
  -H "Authorization: Bearer <accessToken do admin>" -H 'content-type: application/json' \
  -d '{"usuarioId":"5eed0000-0000-4000-8000-000000000003","uid":"04:a1:b2:c3","descricao":"Cartão azul"}'
# 201 {"id":"...","usuarioId":"5eed0000-0000-4000-8000-000000000003","uid":"04A1B2C3","descricao":"Cartão azul","ativa":true,"criadaEm":"..."}
```

- A API normaliza o UID. Ela remove `:`, `-` e espaços, e muda as letras para maiúsculas. Assim, `04:a1:b2:c3` e `04A1B2C3` são a mesma tag.
- O UID aceita só hexadecimal, de 8 a 20 caracteres (`422` no campo `uid`).
- O UID é único no sistema. Repetir dá `409 TAG_JA_CADASTRADA`, também com pedidos simultâneos. O índice único do banco decide.
- O usuário deve existir (`404`) e estar ativo (`422` em `usuarioId`).
- Desativar a tag (`ativa: false`) impede que ela abra a catraca. A próxima leitura dá `NEGADO` com `TAG_INATIVA`. Se a mesma tag foi lida há pouco no mesmo terminal, a mudança pode levar até `NFC_DEBOUNCE_SECONDS`.
- O `PATCH` muda só `ativa`. Outro campo (`uid`, `usuarioId` etc.) dá `422`.
- O modo de cadastro grava só o usuário e o prazo no terminal. A próxima tag lida no prazo é vinculada ao usuário. A catraca não abre, e nenhum uso é gasto. A leitura responde `CADASTRADA`.
- O prazo ainda vale no instante exato do `expiraEm`. Depois, o modo termina sem job. Ligar o modo de novo substitui o anterior.

**Leitura da tag no terminal.** O terminal chama `POST /api/v1/terminal/nfc` com `X-Terminal-Id`, `X-Terminal-Key` e um `Idempotency-Key` novo (UUID) a cada leitura. A decisão vem na resposta, sempre com `200`.

```bash
curl -s -X POST http://localhost:3000/api/v1/terminal/nfc \
  -H 'X-Terminal-Id: 5eed0000-0000-4000-8000-000000000006' \
  -H 'X-Terminal-Key: terminal-dev-key-1234567890abcdef1234567890' \
  -H "Idempotency-Key: $(cat /proc/sys/kernel/random/uuid)" -H 'content-type: application/json' \
  -d '{"uid":"04:a1:b2:c3","lidoEm":"2026-10-20T14:32:07Z"}'
# {"resultado":"AUTORIZADO","aberturaMs":5000}  |  {"resultado":"NEGADO","motivo":"TAG_INATIVA"}  |  {"resultado":"CADASTRADA"}
```

- Ordem das verificações: chave já vista, modo de cadastro, repetição rápida, tag, tag ativa, usuário ativo e as verificações de autorização do QR, **sem a distância**.
- A aprovação grava o evento `NFC` e consome um uso na mesma transação. Toda tentativa grava exatamente um evento.
- A leitura não cria comando. O terminal abre ou nega pela resposta.
- A mesma `Idempotency-Key` devolve a decisão anterior, sem novo uso e sem novo evento. A chave de outro terminal dá `409 CONFLICT`. Chave ausente ou fora do formato UUID dá `422`.
- A mesma tag no mesmo terminal em menos de `NFC_DEBOUNCE_SECONDS` (3 s) recebe a decisão anterior. Com 3 s exatos, é uma tentativa nova.
- Com o modo de cadastro ligado, a leitura vincula a tag ao usuário e responde `CADASTRADA`. Ela não consome uso e não grava evento. Um UID que já existe dá `409 TAG_JA_CADASTRADA`.

</details>

<details>
<summary><b>Eventos guardados sem conexão</b></summary>
<br>

Sem rede, o terminal **nega** as leituras e as guarda. Quando a rede volta, ele envia tudo em `POST /api/v1/terminal/events/batch`, com os cabeçalhos do terminal.

```bash
curl -s -X POST http://localhost:3000/api/v1/terminal/events/batch \
  -H 'X-Terminal-Id: 5eed0000-0000-4000-8000-000000000006' \
  -H 'X-Terminal-Key: terminal-dev-key-1234567890abcdef1234567890' -H 'content-type: application/json' \
  -d '{"events":[{"clientEventId":"3f1c9a52-8e0b-4f55-9d57-2a6f0c1d7e44","metodo":"NFC","uid":"04:a1:b2:c3","ocorridoEm":"2026-10-20T14:12:07Z","resultado":"NEGADO","motivo":"TERMINAL_OFFLINE"}]}'
# {"aceitos":1,"duplicados":0}
```

- **Só negações.** Um evento `AUTORIZADO`, um `metodo` diferente de `NFC` ou um `motivo` diferente de `TERMINAL_OFFLINE` recusa o lote inteiro com `422`. O `details` mostra o índice (`events.1.resultado`). Nada é gravado, nenhum uso é consumido e nenhum comando é criado.
- **Idempotência.** Cada evento tem uma `clientEventId` (UUID do terminal). Uma chave já guardada não é gravada de novo e não é erro: ela entra em `duplicados`.
- O terminal pode enviar o mesmo lote muitas vezes. Ele deve guardar os eventos até receber o `200`. Um `500` significa que nada foi confirmado.
- **Limites.** De 1 a 50 eventos. Corpo de até 64 kb (acima disso, `413 PAYLOAD_TOO_LARGE`). O limite geral da API é 100 kb.
- `ocorridoEm` é o relógio do terminal. Ele vale de 7 dias atrás até 5 minutos à frente do servidor, com as pontas incluídas.
- Cada evento é uma linha do histórico com o `motivo` `TERMINAL_OFFLINE`, no instante da leitura (não do envio). Se a tag é conhecida, a linha tem a pessoa. Se não, `usuario: null`.
- As leituras ao vivo da mesma tag não mudam. A repetição rápida verifica só leituras ao vivo.

</details>

<details>
<summary><b>Autorizações</b></summary>
<br>

Criar, listar e cancelar: só `ADMIN`. Ler uma autorização e listar "as minhas": cada usuário vê só as próprias.

| Rota                                                                                                    | Quem                                                                            |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `POST /authorizations`                                                                                  | `ADMIN`                                                                         |
| `GET /authorizations` (filtros `usuarioId`, `accessPointId`, `situacao`, `dataDe`, `dataAte`; paginada) | `ADMIN`                                                                         |
| `GET /authorizations/{id}`                                                                              | `ADMIN` lê qualquer uma; os demais, só as próprias (a de outra pessoa dá `404`) |
| `PATCH /authorizations/{id}/cancel`                                                                     | `ADMIN`                                                                         |
| `GET /me/authorizations`                                                                                | qualquer perfil, só as do token                                                 |

```bash
curl -X POST http://localhost:3000/api/v1/authorizations \
  -H "Authorization: Bearer <accessToken do admin>" -H 'content-type: application/json' \
  -d '{"usuarioId":"<id do visitante>","accessPointId":"<id do ponto>","dataInicio":"2026-10-20","dataFim":"2026-10-25","horaInicio":"08:00","horaFim":"18:00","usosPermitidos":3}'
```

- Usuário ou ponto inexistente dá `404`. Inativo dá `422` no campo `usuarioId` ou `accessPointId`.
- `dataFim` não pode ser antes de `dataInicio` nem antes de hoje em São Paulo.
- `horaFim` deve ser depois de `horaInicio`. A autorização não passa da meia-noite.
- A resposta tem `usosRestantes` e `situacaoEfetiva` (`ATIVA`, `CANCELADA`, `EXPIRADA` ou `ESGOTADA`). A API calcula os dois no momento.
- A criação trava o usuário e o ponto (`FOR SHARE`) até gravar. Uma desativação simultânea espera. Se a desativação já terminou, a criação é recusada.
- O filtro `situacao` usa a situação **efetiva** e está na consulta.
- `dataDe` e `dataAte` mantêm as autorizações com período sobreposto ao intervalo. As pontas estão incluídas.
- A lista do admin começa pelas mais recentes. `/me/authorizations` ordena por `dataFim`: as que terminam primeiro vêm antes.
- Cancelar é idempotente. Cancelar de novo devolve `200` com o estado atual. A API não muda quem cancelou nem o motivo (`motivo` opcional, até 200 caracteres).

```bash
curl -X PATCH http://localhost:3000/api/v1/authorizations/<id>/cancel \
  -H "Authorization: Bearer <accessToken do admin>" -H 'content-type: application/json' \
  -d '{"motivo":"Pedido da moradora"}'
```

</details>

<details>
<summary><b>Histórico de acessos</b></summary>
<br>

As tentativas de acesso, aprovadas e negadas, da mais recente para a mais antiga (tag `AccessEvents` no Swagger). As rotas são só de leitura. Ninguém edita nem apaga um evento.

| Rota                                                                                                                              | Quem                            |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `GET /access-events` (filtros `usuarioId`, `accessPointId`, `terminalId`, `metodo`, `resultado`, `motivo`, `de`, `ate`; paginada) | `ADMIN` (os demais levam `403`) |
| `GET /me/access-events` (os mesmos filtros, menos `usuarioId`; paginada)                                                          | qualquer perfil, só os do token |

```bash
curl "http://localhost:3000/api/v1/access-events?resultado=NEGADO&metodo=NFC&pageSize=10" \
  -H "Authorization: Bearer <accessToken do admin>"
```

- Cada evento tem a pessoa, o local com o edifício e o terminal (`usuario`, `local`, `terminal`). Assim, o app faz uma só chamada.
- Os três campos são `null` quando a tentativa não os identifica. Exemplo: uma tag NFC desconhecida não tem pessoa.
- O UID da tag, o prefixo do hash da credencial e a `Idempotency-Key` ficam no registro. Eles **não** aparecem na resposta.
- Os filtros se combinam. `de` e `ate` são **instantes** ISO 8601 (`2026-10-20T14:00:00Z` ou com fuso, `-03:00`). As duas pontas estão **incluídas**.
- Uma data sem hora dá `422`. Um `ate` antes de `de` também dá `422`. Na URL, envie o `+` de um fuso positivo como `%2B`.
- `motivo` aceita só os códigos do contrato (seção 4.4), também `TERMINAL_OFFLINE`.
- Em `/me/access-events`, o dono é sempre o do token. A API ignora um `usuarioId` na query. Um usuário desativado recebe `401`.
- A ordem é por `ocorridoEm` e, no mesmo instante, por `id`. Assim, uma página nunca repete nem pula um evento.
- Com 10 mil eventos, uma página volta em cerca de 20 ms (a meta é 300 ms).

</details>

---

## Segurança e monitoramento

Checklist completo, com a evidência de cada item e a troca de segredos: [docs/seguranca.md](docs/seguranca.md).

- **Prontidão.** `GET /api/v1/ready` (pública) dá `200` com o banco no ar e `503` sem o banco. O `/health` sempre dá `200`. Use o `/ready` num monitor de disponibilidade.
- **Cabeçalhos.** `helmet` em todas as respostas. `Strict-Transport-Security` de um ano só em produção (`NODE_ENV=production`). O provedor de hospedagem fornece o HTTPS. O CORS aceita só as origens de `CORS_ORIGINS`.
- **Limites de requisição** (`429 RATE_LIMITED`): login, validação de QR, cada terminal, falhas de autenticação do terminal por IP e rotas públicas. Os limites por minuto enviam `Retry-After`. O intervalo mínimo do heartbeat e do QR não envia.
- **Proxy.** Atrás de um proxy, configure `TRUST_PROXY` com o número de proxies. Sem isso, todos os clientes têm o mesmo IP. Na homologação, o valor é `1`.
- **Validação.** O `zod` valida toda entrada. Um teste verifica todas as rotas registradas. Ele falha se uma rota não tem classificação e validação.
- **Erros e logs.** O `500` não mostra `stack` em produção. Os logs ocultam `authorization`, `cookie` e `x-terminal-key`. Os logs nunca gravam corpos de requisição.
- **Segredos e dependências.** O job **Segurança** do CI roda `npm audit --omit=dev --audit-level=high` e uma busca de segredos (gitleaks) em todo o histórico.
- **Trocar o `JWT_SECRET` ou a chave de um terminal:** [docs/seguranca.md](docs/seguranca.md#6-troca-de-segredos).

---

## Testes e qualidade

```bash
npm test             # unitários (sem banco), rápidos
npm run test:watch   # unitários em modo watch (ciclo TDD)
npm run test:int     # integração (supertest + PostgreSQL de testes)
npm run test:cov     # unitários com cobertura (mínimo 80% de linhas, 75% de branches)
npm run lint         # ESLint, também a regra de fronteira de camadas
npm run typecheck    # tsc sem emitir arquivos (src e test)
npm run format       # Prettier
```

- Os testes unitários ficam ao lado do código (`src/**/*.spec.ts`).
- Os testes de integração ficam em `test/integration/**/*.test.ts`.
- Antes de abrir um PR, rode `typecheck`, `lint`, `test` e `test:int`. Os quatro devem passar.

---

## Integração e entrega contínuas

<details>
<summary><b>CI: o que roda em cada push e PR</b></summary>
<br>

O workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) ("Backend CI") roda em **todo push e todo pull request**. Quando `backend/**` muda, ele executa nesta ordem:

1. instala as dependências (`npm ci`, com cache) e gera o client do Prisma;
2. roda o lint (também a regra de fronteira de camadas) e o typecheck;
3. faz o build;
4. migra o banco de teste (PostgreSQL 17 como serviço do job);
5. roda os testes unitários com cobertura (mínimo 80% de linhas e 75% de branches) e publica o relatório como artefato `backend-coverage` (aba **Actions** do run);
6. roda os testes de integração.

Em paralelo, o job **Segurança** roda `npm audit --omit=dev --audit-level=high` e a busca de segredos (gitleaks, versão e checksum fixos, configuração em [`.gitleaks.toml`](../.gitleaks.toml)). Este job **não** faz parte do `backend-ci` obrigatório. Assim, uma vulnerabilidade nova fica visível e não trava os outros PRs.

O job final **`backend-ci`** é o único check obrigatório na proteção de `develop` e `main`. Ele passa quando o backend passou na validação ou quando o PR não muda o backend. Assim, PRs só de `mobile/` ou `terminal/` não esperam um check que não rodou.

A regra de proteção está em [`.github/rulesets/protecao-develop-main.json`](../.github/rulesets/protecao-develop-main.json): PR obrigatório, 1 aprovação, check `backend-ci` obrigatório, sem force-push e sem exclusão. Um admin do repositório a aplica em **Settings > Rules > Rulesets > New ruleset > Import a ruleset**.

Para receber um aviso quando um run falha, ligue **GitHub > Settings > Notifications > Actions**.

Para reproduzir o CI no seu computador (com o banco do compose de pé e migrado):

```bash
npm run db:generate && npm run lint && npm run typecheck && npm run build
npm run test:cov && npm run test:int
```

</details>

<details>
<summary><b>CD: deploy em homologação</b></summary>
<br>

O job `deploy` do `ci.yml` chama o [`.github/workflows/cd.yml`](../.github/workflows/cd.yml) ("Backend CD"). Ele roda só num push na `develop` que muda o backend, e só depois do `backend-ci` verde.

1. Verifica os secrets e as variáveis do ambiente `homologacao`.
2. Faz o build da imagem `runtime` e a publica no GHCR com a tag do SHA.
3. Aplica as migrações no Neon com a URL direta.
4. Entra no Azure por OIDC (sem senha guardada no GitHub).
5. Publica a nova revisão no Container App.
6. Espera a revisão ficar pronta com a imagem nova.
7. Roda o teste de fumaça do `/health` por HTTPS.

Um passo com falha deixa o pipeline vermelho. Configuração, secrets e rollback: [docs/deploy-azure.md](docs/deploy-azure.md).

</details>

<details>
<summary><b>CI de outra parte do repositório (mobile, terminal)</b></summary>
<br>

Não edite o `ci.yml`. Crie um arquivo novo em `.github/workflows/` (exemplo: `mobile-ci.yml`):

1. Dê um `name` próprio.
2. Rode em `push` e `pull_request`.
3. Use o mesmo padrão de detecção de mudanças, com a sua pasta.
4. Termine com um job de passagem de nome único (exemplo: `mobile-ci`). Ele é o check obrigatório da sua parte.

O [`mobile-ci.yml`](../.github/workflows/mobile-ci.yml) ("Mobile CI") é diferente. Ele filtra por `paths` (`mobile/**` e `docs/app-mobile/**`). Assim, o workflow não começa em PRs que não mudam o app. Mas, se o `mobile-ci` ficar obrigatório, um PR fora desses caminhos espera um check que nunca roda. Neste caso, troque o `paths` pela detecção de mudanças do `ci.yml`.

</details>

---

## Estrutura

Clean Architecture, com um use case por pasta. Detalhes e regra de dependência: [docs/ai/01-architecture.md](docs/ai/01-architecture.md).

```text
src/
  config/         variáveis de ambiente validadas (zod) e versão
  shared/errors/  AppError e subclasses
  entities/       entidades e regras puras
  repositories/   ports de repositório
  providers/      ports de serviços (IClock, ILogger, ...)
  useCases/       <Módulo>/<UseCase>/ com UseCase, Controller, DTO, spec e index
  infra/          implementações: http (middlewares, desligamento), providers, database, repositories, jobs
  main/           container, app (sem listen), server (listen e sinais), routes
prisma/           schema.prisma, migrations/ (com os CHECK em SQL) e seed.ts
scripts/          ferramentas: diagrama ER, QR de desenvolvimento, teste de fumaça do deploy
test/
  doubles/        fakes para testes unitários (FakeClock, InMemoryUserRepository, FakeHashProvider, ...)
  factories/      makeUser(), makeAuthorization(), ...
  integration/    supertest + PostgreSQL (schema, seed, health, auth)
```

<details>
<summary><b>Scripts do <code>package.json</code></b></summary>
<br>

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
| `dev:qr`     | `tsx scripts/dev-qr.ts`: QR de teste do terminal de desenvolvimento          |

</details>

---

## Documentação

<div align="center">

| Documento                                                    | Conteúdo                                                           |
| :----------------------------------------------------------- | :----------------------------------------------------------------- |
| [openapi.yaml](openapi.yaml) (Swagger em `/docs`)            | contrato de todas as rotas, com exemplos de cada resposta          |
| [docs/deploy-azure.md](docs/deploy-azure.md)                 | deploy em homologação: Azure, OIDC, secrets, rollback e HTTPS      |
| [docs/arquitetura-backend.md](docs/arquitetura-backend.md)   | camadas, decisões, segurança e operação                            |
| [docs/sequencias.md](docs/sequencias.md)                     | diagramas de sequência do acesso por QR, por NFC e do lote offline |
| [docs/comunicacao.md](docs/comunicacao.md)                   | como o app e o terminal falam com a API                            |
| [docs/modelo-de-dados.md](docs/modelo-de-dados.md)           | diagrama ER (gerado do schema)                                     |
| [docs/seguranca.md](docs/seguranca.md)                       | checklist de segurança, limites, troca de segredos e monitoramento |
| [docs/plano-de-testes.md](docs/plano-de-testes.md)           | estratégia de testes e relatório de execução                       |
| [docs/backup-e-restauracao.md](docs/backup-e-restauracao.md) | copiar e restaurar o banco                                         |
| [docs/ambiente-dev.md](docs/ambiente-dev.md)                 | dados de desenvolvimento e roteiro com `curl`                      |
| [docs/eventos-campos.md](docs/eventos-campos.md)             | o significado de cada campo do histórico                           |

</div>

---

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0A7C66,100:17364F&height=120&section=footer" width="100%" />

<div align="center">

Backend do **Passe** · equipe **DevFlow** · FATEC Jacareí · ABP 2026-2

</div>
