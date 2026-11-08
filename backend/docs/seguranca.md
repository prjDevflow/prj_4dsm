# Segurança e monitoramento do backend (B20)

Checklist de segurança (RNF02) com a evidência de cada item, os limites de requisição, os procedimentos de troca de segredos e o monitoramento (RNF12). Cada item aponta o teste automatizado ou o comando que o prova. Rode os comandos para conferir; não confie só neste texto.

Situação em 2026-11-08, na branch `feature/B20-security-monitoring-docs`.

| # | Item | Situação | Evidência |
|---|---|---|---|
| 1 | `helmet`, CORS e HTTPS (HSTS em produção) | ✅ no código · HTTPS real depende da B10 | [seção 1](#1-helmet-cors-e-https) |
| 2 | Limites de requisição nas rotas públicas e do terminal | ✅ | [seção 2](#limites-de-requisição) |
| 3 | Validação de entrada em todas as rotas | ✅ | [seção 3](#3-validação-de-entrada-em-todas-as-rotas) |
| 4 | Varredura de segredos e `npm audit` no CI | ✅ local · 1ª execução no GitHub acontece no PR | [seção 4](#4-segredos-no-repositório-e-dependências) |
| 5 | Logs sem dados sensíveis e erros sem stack em produção | ✅ | [seção 5](#5-logs-e-erros) |
| 6 | Troca do `JWT_SECRET` e da chave do terminal | ✅ documentada | [seção 6](#6-troca-de-segredos) |
| M | `/ready` e alerta de queda | ✅ `/ready` · ⬜ alerta em até 5 min depende da B10 | [seção 7](#7-monitoramento) |

## 1. `helmet`, CORS e HTTPS

**O que existe** ([src/main/app.ts](../src/main/app.ts)):

- `helmet` com os padrões da versão 8: `Content-Security-Policy` (`default-src 'self'`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, sem `X-Powered-By`.
- **HSTS só em produção** (`NODE_ENV=production`): `Strict-Transport-Security: max-age=31536000; includeSubDomains` (um ano). Fora de produção não há HSTS, para o navegador não guardar a regra "só HTTPS" para o `localhost`. O valor está escrito no código, não depende do padrão da biblioteca.
- **CORS por lista de origens** (`CORS_ORIGINS`, obrigatória e sem valor padrão: a API não sobe sem ela). Uma origem fora da lista não recebe `Access-Control-Allow-Origin`, e o navegador bloqueia a chamada. O pacote `cors` sempre manda `Access-Control-Allow-Methods`, e esse cabeçalho sozinho não libera nada.

**HTTPS.** O TLS termina no provedor de hospedagem (B10, ainda pendente), não na API. A API não redireciona HTTP para HTTPS: o terminal pode usar HTTP em homologação, e o redirecionamento é configuração do provedor. O HSTS faz o navegador (por exemplo, ao abrir o Swagger em `/docs`) recusar HTTP depois da primeira visita por HTTPS. Atrás de um proxy ou balanceador, configure `TRUST_PROXY` (seção 2).

**Testes:** [securityHeaders.test.ts](../test/integration/securityHeaders.test.ts) (8 casos). Foram provados por mutação: helmet removido, CORS aberto a qualquer origem, HSTS de 180 dias, HSTS sem subdomínios e HSTS ligado fora de produção. Todas derrubaram o teste certo.

**Comando (API em produção, banco no ar):**

```bash
NODE_ENV=production PORT=3999 npx tsx src/main/server.ts &
curl -sI http://localhost:3999/api/v1/health | grep -iE '^(strict-transport|x-content-type|x-frame|referrer|content-security)'
```

Saída conferida em 2026-11-08:

```text
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
```

## 2. Limites de requisição

Todo limite responde `429` com o código `RATE_LIMITED` no formato de erro da API e o cabeçalho `Retry-After`. Os contadores ficam **na memória do processo**: um reinício os zera, e com mais de uma instância da API cada uma conta à parte.

| Rota | Quem é contado | Limite (variável) | Padrão |
|---|---|---|---|
| `POST /auth/login` | IP + e-mail | `LOGIN_MAX_PER_MINUTE` | 5 por minuto |
| `POST /access/qr/validate` | usuário do token | `QR_VALIDATE_MAX_PER_MINUTE` | 10 por minuto |
| `GET /health`, `GET /ready` | IP (as duas rotas somam) | `PUBLIC_MAX_PER_MINUTE` | 120 por minuto |
| Todas as `/terminal/*` | terminal (depois de autenticar) | `TERMINAL_MAX_PER_MINUTE` | 300 por minuto, somando as rotas |
| Todas as `/terminal/*` | IP, só falhas de autenticação (`401` e `403`) | `TERMINAL_AUTH_FAIL_MAX_PER_MINUTE` | 20 por minuto |
| `POST /terminal/heartbeat` | terminal | `HEARTBEAT_MIN_INTERVAL_S` | 1 a cada 2 s |
| `POST /terminal/qr` | terminal | `QR_ISSUE_MIN_INTERVAL_S` | 1 a cada 5 s |
| Qualquer rota | tamanho do corpo | fixo | 100 kb (`413`); o lote offline, 64 kb |

Como escolhi os 300 por minuto por terminal: o uso normal é cerca de 60 consultas de comandos (uma por segundo), até 30 heartbeats, 6 QR e algumas leituras NFC, ou seja, menos de 150. Se o `COMMAND_POLL_MS` for reduzido, o limite precisa subir junto.

**Como a falha de autenticação funciona.** O contador por IP roda **antes** de conferir a chave e só conta respostas `401` e `403`: o terminal que acerta a chave não gasta nada, e erros como `422` ou `500` também não. Passando de `TERMINAL_AUTH_FAIL_MAX_PER_MINUTE`, o IP recebe `429` em **todas** as rotas do terminal até o minuto acabar, mesmo com a chave certa. É isso que impede a adivinhação de chaves. A consequência: um terminal que divide o endereço com quem está errando a chave fica sem acesso por até um minuto, e quem consegue manter o ataque mantém o bloqueio.

**`TRUST_PROXY`.** Todo limite por IP lê `req.ip`. Atrás de um proxy ou balanceador, o IP que a API enxerga é o dele, e todos os clientes dividiriam o mesmo contador (um cliente esgota a cota dos outros). `TRUST_PROXY` é o **número de proxies** na frente da API: `0` (padrão) ignora `X-Forwarded-For`, `1` confia em um proxy. Nunca use `true`: ele confiaria no cabeçalho que o próprio cliente manda. IPv6 é agrupado por bloco /56, para trocar de endereço dentro do mesmo bloco não escapar do limite.

**Fora do escopo desta etapa.** As rotas autenticadas do app (cadastros, listagens, autorizações) não têm limite próprio além do login e da validação de QR: exigem JWT de um usuário real, e o dano de um token abusado é o do perfil dele. Se o grupo quiser, um limite por usuário nelas é o próximo passo, com a mesma fábrica (`makeRateLimit`).

**Testes:** [rateLimits.test.ts](../test/integration/rateLimits.test.ts) (fiação com os valores reais do ambiente, em todas as rotas do terminal lidas do router), e os specs [terminalRateLimit](../src/infra/http/terminalRateLimit.spec.ts), [terminalAuthFailLimit](../src/infra/http/terminalAuthFailLimit.spec.ts), [publicRateLimit](../src/infra/http/publicRateLimit.spec.ts) e [loginRateLimit](../src/infra/http/loginRateLimit.spec.ts). Mutações mortas: limite +1, chave fixa, IP sem agrupar, limitador fora de ordem, sem limitador, limite fixo ignorando a variável, `/ready` fora do limitador, `trust proxy` sempre 0 e sempre `true`.

Também foi corrigido o aviso `ERR_ERL_KEY_GEN_IPV6` do `express-rate-limit`, que aparecia nos testes que criam o app: a chave do login já agrupava o IPv6, mas o aviso lê o texto da função e não via o `ipKeyGenerator`. Agora ele é chamado dentro da própria função: o spec do limitador do login prova que o aviso não é emitido, e a saída avulsa de `ready.test.ts`, que o mostrava antes da correção, não o mostra mais.

## 3. Validação de entrada em todas as rotas

Toda entrada é validada na borda com `zod`; os erros saem no formato `{ error: { code, message, details? } }`.

O teste [routeInventory.test.ts](../test/integration/routeInventory.test.ts) lê as rotas do router real e exige que **cada uma** esteja classificada. Com as 37 rotas de hoje:

| Tipo | Rotas | O que o teste envia | Esperado |
|---|---|---|---|
| Corpo JSON | 18 | um corpo que não é objeto (`[]`) | `422 VALIDATION_ERROR` |
| Filtros na consulta | 10 | um filtro inválido (`page=abc`, `limit=abc`) | `422 VALIDATION_ERROR` |
| Só `:id` no caminho | 5 | um id malformado | `404 NOT_FOUND` (decisão da B06: o banco nunca vê um id inválido) |
| Sem entrada | 4 | | |

Uma rota nova sem entrada no inventário derruba o teste e obriga quem a criou a dizer como a entrada dela é validada. O mesmo teste confere que o `openapi.yaml` documenta todas as rotas registradas e nenhuma que não exista.

Resultado: **nenhuma rota estava sem validação**. Os testes passaram de primeira e foram provados por mutação (corpo sem validar em `POST /buildings` e `POST /terminal/heartbeat`, consulta sem validar em `GET /users`, id sem conferir em `GET /users/:id`, rota nova sem inventário, rota sem documentação e documentação de rota inexistente).

## 4. Segredos no repositório e dependências

Roda no job **Segurança** do [ci.yml](../../.github/workflows/ci.yml), separado do `backend-ci` obrigatório: uma vulnerabilidade publicada amanhã deixa o job vermelho e visível sem travar o merge dos outros PRs.

### Dependências (`npm audit`)

```bash
cd backend && npm audit --omit=dev --audit-level=high
```

- O gate falha em vulnerabilidade **alta ou crítica** nas dependências de produção.
- Antes: 2 vulnerabilidades em produção (`body-parser` alta, por negação de serviço com corpo comprimido; `fast-uri` moderada). Corrigidas com `npm update body-parser fast-uri` (só o `package-lock.json` muda; as duas são transitivas): `body-parser` 2.3.0 para 2.4.0 e `fast-uri` 3.1.8 para 3.1.9.
- Depois: **0 vulnerabilidades em produção**.
- `npm audit` completo (com as dependências de desenvolvimento) mostra **10 moderadas, todas na cadeia do ESLint** (`eslint`, `typescript-eslint`, `minimatch`). Não vão para a imagem de produção e ficam fora do gate. Reavalie quando o ESLint publicar a correção.

### Segredos (gitleaks)

O CI baixa o gitleaks **8.30.1** com versão e SHA-256 fixos (`551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`, o mesmo do arquivo `gitleaks_8.30.1_checksums.txt` da release) e varre todo o histórico:

```bash
gitleaks git --no-banner --redact --config .gitleaks.toml .
```

Em 2026-11-08, no histórico completo (738 commits, 4,6 MB):

- Sem configuração: **31 achados**, todos revisados um a um e **todos falsos positivos**: UUIDs de chaves de idempotência e tokens de exemplo em testes (`q3F8k2Zr1pLw9XbTn0YhVA` é o exemplo do contrato), `apiKey` e `accessToken` de exemplo no `openapi.yaml`, senhas e segredos de teste (`Senha-Valida-123`, `segredo-de-teste-...`) e os `curl` do README com a chave do terminal de desenvolvimento, que é pública por construção.
- Com o [.gitleaks.toml](../../.gitleaks.toml): **nenhum achado**. As dispensas valem para **uma regra** em certos caminhos (`generic-api-key` em `*.spec.ts`, `backend/test/` e `backend/openapi.yaml`; `curl-auth-header` no README e em `backend/docs/`). Todas as outras regras continuam valendo em qualquer arquivo.
- A configuração não esconde segredo de verdade: um token do GitHub gerado na hora e colocado em `backend/src/` e em um `*.spec.ts` foi encontrado nos dois lugares (regra `github-pat`).

Adicionar um novo falso positivo exige editar o `.gitleaks.toml` num PR, onde alguém revisa. Se um segredo de verdade entrar no repositório: **troque o segredo primeiro** (seção 6), depois remova do histórico.

## 5. Logs e erros

- **Logs estruturados** (pino, JSON no stdout), uma linha por requisição com `X-Request-Id`. O corpo das requisições e das respostas **nunca** é registrado. Os cabeçalhos `authorization`, `cookie` e `x-terminal-key` saem como `[oculto]`.
- **Testes:** [requestLog.test.ts](../test/integration/requestLog.test.ts) roda os fluxos reais (login, uso do token, `rotate-key`, chamadas do terminal com a chave antiga e com a nova) e prova que no log não aparecem a senha, o token, a chave do terminal (antiga e nova) nem os hashes. Mutações mortas: sem ocultar `authorization`, sem ocultar `x-terminal-key` e sem ocultar nada.
- **Erro `500`** responde sempre `{ "error": { "code": "INTERNAL_ERROR", "message": "Erro interno do servidor" } }`. Em produção não há `stack` nem mensagem interna, mesmo quando o erro do driver do banco traz uma URL de conexão. O teste usa uma rota real (`GET /auth/me`) com o banco falhando ([errors.test.ts](../test/integration/errors.test.ts)); a mutação "stack exposta em produção" o derruba. A `stack` completa vai só para o log do servidor, com o `requestId`, para quem opera a API.
- Fora de produção o `500` mostra a `stack` para facilitar a depuração; o compose roda a API com `NODE_ENV=production`.

## 6. Troca de segredos

### `JWT_SECRET` (assinatura dos tokens do app)

Quando trocar: suspeita de vazamento, saída de alguém com acesso ao ambiente, ou rotina (por exemplo, a cada semestre).

1. Gere um segredo novo: `openssl rand -base64 48` (mínimo de 32 caracteres; a API não sobe com menos).
2. Troque `JWT_SECRET` no ambiente do servidor (variável do provedor ou `.env` do compose). **Um valor diferente em cada ambiente.**
3. Reinicie a API (`docker compose up -d --force-recreate api`, ou o redeploy do provedor). Variáveis de ambiente só são lidas na partida.
4. Confira: `GET /api/v1/auth/me` com um token antigo deve dar `401`, e um login novo deve funcionar.

Efeito: **todos os tokens emitidos até então deixam de valer** (o app recebe `401` e pede o login de novo). A API usa um só segredo (HS256), então não existe janela com os dois valores: faça fora do horário de pico. As chaves dos terminais não mudam. Teste: `JwtTokenProvider.spec.ts` ("deve recusar um token assinado com outro segredo").

### Chave de um terminal

Quando trocar: terminal perdido, roubado ou com firmware exposto; suspeita de vazamento da chave; rotina.

1. Entre como `ADMIN` e chame `POST /api/v1/terminals/{id}/rotate-key` (botão no app, ou Swagger em `/docs`). A resposta traz `{ "id", "apiKey" }`. **A chave nova aparece só nesta resposta**; o banco guarda apenas o SHA-256.
2. Grave a chave nova no terminal (configuração do firmware ou NVS) antes de fechar a tela: não há como consultá-la depois, só gerar outra.
3. Confira: o terminal volta a receber `200` em `GET /terminal/commands`.

Efeito: **a chave antiga deixa de valer na hora** (`401`). Enquanto o terminal não receber a nova, ele fica sem acesso, e as falhas contam no limite por IP (`TERMINAL_AUTH_FAIL_MAX_PER_MINUTE`), então troque a chave no aparelho sem repetir tentativas por mais de um minuto. Teste: [terminals.test.ts](../test/integration/terminals.test.ts) ("a chave antiga deixa de valer na hora e a nova passa a valer").

No ambiente de desenvolvimento, a chave do terminal do seed é pública (`SEED_TERMINAL_KEY` no `.env.example`). Depois de um `rotate-key` nele, rode o seed de novo para restaurá-la.

## 7. Monitoramento

| Rota | Serve para | Resposta |
|---|---|---|
| `GET /api/v1/health` | saber se o **processo** está vivo | sempre `200`; mostra `db: up` ou `db: down` |
| `GET /api/v1/ready` | **alertas** e balanceadores | `200` com o banco no ar; `503` quando ele não responde (a API está de pé, mas não consegue trabalhar) |

As duas são públicas, têm limite por IP (`PUBLIC_MAX_PER_MINUTE`) e não expõem a mensagem de erro do banco.

**Verificação manual feita em 2026-11-08** (API local em `NODE_ENV=production`, banco do `docker compose`):

```text
banco no ar        GET /ready  -> 200 {"status":"ready","db":"up","time":"..."}
                   GET /health -> 200 {"status":"ok",...,"db":"up"}
docker compose stop db
                   GET /ready  -> 503 {"status":"unavailable","db":"down","time":"..."}  (em 8 ms)
                   GET /health -> 200 {"status":"ok",...,"db":"down"}                      (em 5 ms)
docker compose restart db (a mesma instância da API, sem reiniciar)
                   GET /ready  -> 503 durante a subida do banco
                   GET /ready  -> 200 dois segundos depois do restart
```

A API ficou de pé o tempo todo, e o pool de conexões se recuperou sozinho. Numa parada anterior (`stop` e `start`), o PostgreSQL levou cerca de 5 minutos para voltar (recuperação de falha com sincronização do diretório de dados); o `/ready` ficou em `503` durante todo esse tempo, que é o comportamento certo.

**Alerta de queda em até 5 minutos: ainda não verificado.** Depende de um ambiente publicado (B10) e de um monitor externo. Quando houver URL, configure um monitor gratuito de disponibilidade em `GET /api/v1/ready` com:

- o **intervalo mais curto que o plano oferecer** (um intervalo de 5 minutos já estoura o prazo de "alerta em até 5 minutos", porque o aviso só sai depois da verificação seguinte) e o alerta por e-mail ou chat para o grupo;
- um **timeout de resposta** de uns 10 s e a regra "falha = qualquer resposta que não seja `200`, ou nenhuma resposta". Se o PostgreSQL congelar sem recusar conexões (rede ou disco parados), a consulta do `/ready` pode demorar para responder; o timeout do monitor trata isso como queda. A API não impõe um prazo próprio à consulta.

Para validar: pare o banco do ambiente publicado, cronometre até o aviso chegar e registre o tempo aqui.

**Selos no README.** O selo do CI já está no [README](../README.md). O do CD entra quando a B10 criar o workflow de deploy.

## 8. Limitações conhecidas

- **UID de NFC é clonável** (decisão 12 do contrato): limitação aceita do projeto.
- **Um terminal comprometido forja negações offline** em nome de quem tem tag, porque escolhe o UID do lote (mesma família do UID clonável).
- **Contadores de limite na memória do processo** (seção 2).
- **Bloqueio por IP afeta quem divide o endereço** (seção 2).
- **Sem limite nas rotas de cadastro do app** (seção 2).
- **Sem HTTPS real até a B10.**
- **A consulta do `/ready` não tem prazo próprio** (seção 7).
