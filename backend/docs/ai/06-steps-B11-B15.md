# 06 — Etapas B11 a B15: terminal, QR Code e validação (núcleo do sistema)

Carregue este arquivo quando a etapa atual estiver entre B11 e B15. Leia antes `02-tdd-workflow.md`, e `03-domain-and-contract.md` (seções 4.3 a 4.5 e 5 são a base destas etapas).

Legenda: **U** = unitário (doubles, sem banco) · **I** = integração (supertest + PostgreSQL de testes).

Ordem de construção sugerida dentro do bloco: B11 e B12 (independentes) → B13 → B14 → B15. A B15 só começa com B08, B11, B12, B13 e B14 prontas.

---

### B11 — Heartbeat e posição do terminal (parte do RF11)

- **Depende de:** B07 · **Libera:** B15 (posição de referência); **Matheus (I05, I09) ★**
- **Prazo:** Sprint 2, semana 1 · **Prioridade:** 🔴
- **Objetivo:** o backend sabe se cada terminal está vivo e onde está, e ajusta parâmetros do terminal sem reprogramá-lo.

**Use case** (`src/useCases/TerminalChannel/`): `RegisterHeartbeat`. Regra pura em `entities/rules`: `resolveReferencePosition(terminal, accessPoint, now, config)` (usada pela B15). Port `ITerminalRepository` ganha `updateHeartbeat`.

**Regras**

- `POST /terminal/heartbeat` (autenticado pelo terminal) atualiza `ultimoContatoEm`, `ultimaLat`, `ultimaLon`, `gpsFix`, `gpsSimulado`, `firmware`, `rssi`. Responde `serverTime` (UTC) e `config` (`qrRefreshMs`, `commandPollMs`, `aberturaMs`) vindos do ambiente.
- Valida limites das coordenadas; **ignora** latitude e longitude quando `gpsFix` é falso.
- Limite de 1 heartbeat a cada 2 s por terminal (429). Implementar com `ultimoContatoEm` e `IClock`, assim é testável sem tempo real.
- Posição de referência por `TERMINAL_POSITION_SOURCE`: `GPS_COM_FALLBACK` (padrão) usa o GPS se `gpsFix` e o último contato tem menos de `GPS_MAX_AGE_MIN` (10 min), senão as coordenadas do ponto; `CADASTRO` usa sempre as do ponto; `GPS` só o GPS (falha se não houver).

**Lista de testes**

- [x] U `resolveReferencePosition` em `GPS_COM_FALLBACK`: com fix e contato recente usa o GPS.
- [x] U `resolveReferencePosition` em `GPS_COM_FALLBACK`: GPS antigo (mais de 10 min) cai no cadastro; sem fix cai no cadastro.
- [x] U `resolveReferencePosition` em `CADASTRO`: sempre as coordenadas do ponto.
- [x] U `resolveReferencePosition` em `GPS`: sem fix ou GPS antigo falha de forma explícita.
- [x] U `RegisterHeartbeat`: grava contato, firmware, rssi e posição; devolve `serverTime` e `config`.
- [x] U `RegisterHeartbeat`: com `gpsFix` falso não grava latitude nem longitude.
- [x] U `RegisterHeartbeat`: segundo heartbeat em menos de 2 s lança 429 (`FakeClock`).
- [x] I corpo com latitude fora da faixa → 422.
- [x] I chave inválida → 401.
- [x] I depois de um heartbeat, `GET /terminals` mostra o terminal online com posição e hora do contato.
- [x] I sem heartbeat por mais de 30 s o terminal aparece offline (inserir `ultimoContatoEm` antigo no banco).

**Critérios de aceitação**

- [x] Depois de um heartbeat, `GET /terminals` mostra o terminal online com a posição e a hora do contato.
- [x] Sem heartbeat por mais de 30 s o terminal aparece offline.
- [x] A resposta devolve `serverTime` em UTC e o bloco `config`.
- [x] A função de posição de referência tem teste nos três modos, incluindo "GPS antigo" e "sem fix".
- [x] Chave inválida → 401.

**Definição de pronto**

- [x] Testes de integração e unitários da função de posição.
- [ ] Matheus avisado para testar com o terminal de desenvolvimento (★).

---

### B12 — Emissão do QR Code (RF12)

- **Depende de:** B07 · **Libera:** B15; **Matheus (I06) ★**; Pedro e Matheus (QR de teste)
- **Prazo:** Sprint 2, semana 1 · **Prioridade:** 🔴
- **Objetivo:** o backend gera o QR do terminal 📄; o código é substituído a cada 10 s.

**Use cases** (`src/useCases/TerminalChannel/`): `IssueQrCredential` (com Controller), `PurgeExpiredCredentials` (rodado por um job). Ports: `IQrCredentialRepository` (`saveIfIdle`, `findByTokenHash`, `deleteExpiredBefore`; o `save` + `findLastIssuedAt` do plano original viraram o `saveIfIdle` atômico, ver STATUS, decisão de 2026-10-31), `ISecureRandom`, `IHashProvider.sha256`, `IClock`.

**Regras**

- Gera 16 bytes aleatórios, codifica em base64url (22 caracteres), grava o **SHA-256** do token, `terminalId`, `emitidoEm`, `expiraEm = emitidoEm + QR_TTL_SECONDS (10) + QR_TOLERANCE_SECONDS (5)`. Devolve `payload = "ACS1:" + token`, `emitidoEm`, `expiraEm`, `renovarEmMs` (10000).
- O QR anterior continua válido até a **própria** expiração (no máximo 15 s). Dois QRs válidos por poucos segundos é intencional.
- Limite de 1 QR a cada 5 s por terminal (429), usando o `IClock` e o `saveIfIdle`, que confere a última emissão e grava na mesma transação, com trava consultiva por terminal (pedidos simultâneos emitem um só).
- Job a cada minuto (`infra/jobs`, iniciado em `server.ts`, nunca em `app.ts`) apaga credenciais vencidas há mais de 1 hora.
- Script de desenvolvimento `npm run dev:qr`: emite um QR para o terminal de dev e imprime o `payload`. **Recusa rodar** com `NODE_ENV=production`. Documentar em `docs/ambiente-dev.md`.

**Lista de testes**

- [x] U `IssueQrCredential`: o token tem 22 caracteres e o payload bate com `^ACS1:[A-Za-z0-9_-]{22}$`.
- [x] U `IssueQrCredential`: grava só o hash; nenhum campo salvo contém o token em claro.
- [x] U `IssueQrCredential`: dois pedidos geram tokens diferentes (com `FixedRandom` em sequência).
- [x] U `IssueQrCredential`: `expiraEm` menos `emitidoEm` é 15 s por padrão e muda quando a configuração muda.
- [x] U `IssueQrCredential`: pedido com menos de 5 s do anterior lança 429; com 5 s exatos passa.
- [x] I (acrescentado) oito `POST /terminal/qr` simultâneos do mesmo terminal: um 200, sete 429 e uma só linha; vinte `saveIfIdle` simultâneos gravam uma só.
- [x] U `PurgeExpiredCredentials`: apaga só as vencidas há mais de 1 hora (limites com `FakeClock`).
- [x] I `POST /terminal/qr`: terminal inativo ou chave errada não recebe QR (403 e 401).
- [x] I resposta traz `payload`, `emitidoEm`, `expiraEm` e `renovarEmMs`.
- [x] I a linha em `qr_credentials` tem `tokenHash` de 64 caracteres hexadecimais.

**Critérios de aceitação**

- [x] O token tem 22 caracteres e o payload bate com `^ACS1:[A-Za-z0-9_-]{22}$`.
- [x] O token em claro **não** é gravado; só o hash.
- [x] Dois pedidos seguidos geram tokens diferentes.
- [x] `expiraEm - emitidoEm` é 15 s por padrão e muda se as variáveis mudarem.
- [x] Pedido com menos de 5 s do anterior → 429.
- [x] Terminal inativo ou chave errada não recebe QR.

**Definição de pronto**

- [x] Testes de unicidade, hash, expiração e limite.
- [x] `dev:qr` documentado em `docs/ambiente-dev.md`.

---

### B13 — Registro de eventos (RF17)

- **Depende de:** B04 · **Libera:** B15, B17, B18, B19
- **Prazo:** Sprint 2, semana 2 · **Prioridade:** 🔴
- **Objetivo:** garantir que **toda** tentativa de acesso, aprovada ou negada, gera exatamente um evento 📄.

**Peças** (`src/useCases/Events/`, sem Controller): `AccessEventRecorder` com `recordDenied(input)` e fábrica `AccessEvent.approved(...)` / `AccessEvent.denied(...)`. Port `IAccessEventRepository` **somente de inserção e consulta**: `append`, mais consultas das B17 e B18. Port `IAccessGrantRepository` (aprovação atômica, ver arquivo 01, seção 6) nasce na B15 e já recebe o evento pronto.

**Regras**

- Campos: `ocorridoEm` (UTC), `terminalId`, `accessPointId`, `usuarioId`, `authorizationId` (quando identificados), `metodo`, `resultado`, `motivo`, `distanciaM` (QR), `detalhes` (JSON: precisão do GPS do celular, UID parcial).
- **Aprovação:** o evento entra na **mesma transação** que consome o uso. Se a gravação do evento falhar, tudo é desfeito e o acesso é negado com 500 `INTERNAL_ERROR`. Acesso nunca é concedido sem registro.
- **Negação:** o evento é gravado em seguida; se falhar, registrar o erro no log com contexto e **mesmo assim negar**.
- Credencial inválida ou desconhecida: evento com `terminalId` nulo e, em `detalhes`, só um prefixo (8 caracteres) do hash do token. Nunca o token inteiro.
- A tabela é somente de inserção: o port não tem `update` nem `delete`, e não existe rota para isso.

**Lista de testes**

- [x] U `AccessEventRecorder`: para cada código de motivo do contrato (`it.each` sobre a lista completa, 13 códigos) grava **exatamente um** evento `NEGADO` com o motivo.
- [x] U `AccessEventRecorder`: se o repositório lançar erro, registra no log (com contexto) e **não** propaga; a negação segue.
- [x] U `AccessEvent.approved`: monta o evento com `metodo`, `distanciaM` e `detalhes` sem token, chave ou senha.
- [x] U credencial desconhecida: `terminalId` nulo e `detalhes` com prefixo do hash de no máximo 8 caracteres, sem o token.
- [x] ➡️ B15 · U `InMemoryAccessGrantRepository.commitApproval` com falha injetada no evento: o uso **não** é consumido e a credencial **não** é marcada (all-or-nothing). _Feito na B15 (`src/repositories/InMemoryAccessGrantRepository.spec.ts`)._
- [x] ➡️ B15 · I falha de gravação do evento na aprovação (falha injetada dentro da transação): resposta 500 e `usosRealizados` intacto. _Feito na B15 (`accessQrValidate.test.ts`, com um gatilho do PostgreSQL que recusa o evento) e no repositório (`accessGrantRepository.test.ts`)._
- [x] I falha de gravação do evento numa negação: a negação segue (provado no recorder com falha real do PostgreSQL; a resposta HTTP foi conferida na B15).
- [x] I não existe rota que edite ou apague eventos (`PATCH` e `DELETE` em `/access-events/:id` → 404).

**Critérios de aceitação**

- [x] Um teste para cada motivo da seção 4.4 do arquivo 03 confirma que **exatamente um** evento foi criado.
- [x] ➡️ B15 · Simular falha de gravação na aprovação: o uso **não** é consumido e a resposta é 500.
- [x] Simular falha de gravação na negação: a negação segue (no recorder; a resposta HTTP foi conferida na B15).
- [x] Nenhum evento guarda token, chave ou senha.

**Definição de pronto**

- [x] Testes unitários do recorder e de integração das duas situações de falha. _Negação na B13; aprovação na B15._
- [x] Tabela "campo × quando é nulo" em `docs/eventos-campos.md` para o Pedro (F12) saber o que esperar.

---

### B14 — Canal de comandos para o terminal (parte de RF15 e RF16)

- **Depende de:** B04, B07 · **Libera:** B15; **Matheus (I08) ★**
- **Prazo:** Sprint 2, semana 2 · **Prioridade:** 🔴
- **Objetivo:** o backend diz ao terminal "abra" ou "negue" depois de validar o acesso pelo app.

**Use cases** (`src/useCases/TerminalChannel/`): `ListPendingCommands`, `AckCommand` e `PurgeExpiredCommands` (rodado por um job, como a limpeza de QR). Entidade `TerminalCommand` com fábricas `TerminalCommand.open(...)` e `TerminalCommand.deny(...)` (`expiraEm = criadoEm + COMMAND_TTL_SECONDS`, `aberturaMs` da configuração), que devolvem um `NewTerminalCommand` (o `id` é serial do banco); a criação acontece dentro da transação da B15 (`PrismaTerminalCommandRepository` aceita o cliente da transação). Port `ITerminalCommandRepository`: `create` (devolve o comando com o `id`), `listPending(terminalId, after, limit, now)`, `markDelivered(ids, at)`, `markExecuted(terminalId, id, at)` (false se o comando não é do terminal) e `deleteExpiredBefore(cutoff)`.

**Regras**

- `GET /terminal/commands?after=<id>&limit=10`: comandos do terminal, em ordem crescente de `id`, **não expirados** e com `id` maior que `after`. Marca `entregueEm` na primeira entrega (não sobrescreve nas seguintes).
- `POST /terminal/commands/:id/ack` → 204: marca `executadoEm`. Só comandos do próprio terminal (senão 404).
- 🔴 **Segurança:** comando vencido (mais de 10 s) nunca é entregue. Um `ABRIR` não pode abrir a catraca minutos depois.
- Limpeza: um job a cada minuto (`infra/jobs`, `PurgeJob`, iniciado em `server.ts`) apaga os comandos vencidos há mais de `COMMAND_PURGE_AFTER_HOURS` (1 h), entregues ou não. O `id` serial não volta atrás, então o `after` do terminal continua valendo.
- `limit`: padrão 10, de 1 a 100; `after`: padrão 0, inteiro de 0 a 2147483647; fora disso, 422 no campo. `ack` repetido devolve 204 e preserva o primeiro `executadoEm`; `id` que não é inteiro positivo dá 404.
- 🟢 Opcional, depois do básico: `?wait=15` (espera longa até 15 s ou até chegar comando). _Não feito na B14._
- 🟢 Opcional: endpoint de desenvolvimento para disparar comandos, protegido por `NODE_ENV` diferente de `production`. _Não feito (decisão do autor): até a B15 o comando se cria na mão por SQL, ver `docs/ambiente-dev.md`._

**Lista de testes**

- [x] U `ListPendingCommands`: devolve em ordem crescente de `id`.
- [x] U `ListPendingCommands`: comando com 10 s de vida ainda é entregue; com mais de 10 s não (`FakeClock`).
- [x] U `ListPendingCommands`: `after` evita reentrega; `limit` é respeitado.
- [x] U `ListPendingCommands`: nunca devolve comandos de outro terminal.
- [x] U `ListPendingCommands`: `entregueEm` é marcado na primeira entrega e preservado depois.
- [x] U `AckCommand`: marca `executadoEm`; comando de outro terminal → `NotFoundError`.
- [x] U `TerminalCommand.open` e `deny`: `expiraEm`, `aberturaMs` e `motivo` corretos.
- [x] (acrescentados) U `ListPendingCommands`: só o comando devolvido vira entregue (não o vencido, nem o que ficou fora do `limit`). U `AckCommand`: ack repetido preserva o primeiro `executadoEm`.
- [x] (acrescentados) U `PurgeExpiredCommands`: apaga só os vencidos há mais de 1 h (1 h exata fica, 1 h e 1 ms sai), também os entregues e executados; prazo e relógio injetados. U `PurgeJob`: mensagens de log recebidas. U `parseEnv` e repasse no compose de `COMMAND_TTL_SECONDS` e `COMMAND_PURGE_AFTER_HOURS`.
- [x] (acrescentados) I `PrismaTerminalCommandRepository` com PostgreSQL real (ids crescentes, rollback na transação, ponta de 10 s, `deleteExpiredBefore` estrito). I `GET /terminal/commands` com `after`/`limit` e 422 por campo, `entregueEm` só do devolvido, consultas simultâneas. I `ack` repetido, de comando vencido e ids malformados (404).
- [x] I `GET /terminal/commands` sem cabeçalhos do terminal → 401.
- [x] I comando criado aparece na consulta seguinte (dentro de 1 s).
- [x] I `POST .../ack` devolve 204 e `ack` de comando alheio devolve 404.

**Critérios de aceitação**

- [x] Comando criado aparece em até 1 s na próxima consulta do terminal.
- [x] Comando com mais de 10 s não é entregue.
- [x] Um terminal nunca vê comandos de outro.
- [x] `after` evita reentrega de comandos já vistos.
- [x] `ack` de comando alheio → 404.

**Definição de pronto**

- [x] Testes de ordem, expiração, isolamento entre terminais e `ack`.
- [ ] Matheus avisado do formato exato (seção 4.5 do arquivo 03) e do endpoint de teste de desenvolvimento, se existir.

---

### B15 — Validação de acesso por QR Code (RF13, RF15, RF16, RF17)

- **Depende de:** B08, B11, B12, B13, B14 · **Libera:** B17 (reaproveita o avaliador); **Pedro (F11) ★**; teste ponta a ponta com Matheus
- **Prazo:** Sprint 2, semana 2 · **Prioridade:** 🔴 — **é o núcleo do sistema**
- **Objetivo:** o app envia o QR lido e a posição do celular; o backend decide, consome o uso, registra o evento e manda o comando ao terminal.

**Peças**

- `src/useCases/Access/ValidateQrAccess` (Controller, DTO, UseCase). Entrada: `userId` do token, `payload`, `latitude`, `longitude`, `precisaoMetros?`. Saída: `AccessDecision` (arquivo 01, seção 5).
- Regras puras em `entities/rules`: `AccessEvaluator` (verificações 6 a 9), `haversineDistanceM`, `isWithinWindow`, `resolveReferencePosition` (B11).
- Ports usados: `IQrCredentialRepository`, `IUserRepository`, `ITerminalRepository`, `IAccessPointRepository`, `IAuthorizationRepository.findByUserAndAccessPoint`, `IAccessGrantRepository.commitApproval`, `ITerminalCommandRepository`, `AccessEventRecorder`, `IClock`.
- Rota com `authenticate({ allowInactive: true })` (para registrar o evento `USUARIO_INATIVO`) e limite de 10 validações por minuto por usuário (429).

**Regras**

- Ordem das 11 verificações: tabela da seção 5.1 do arquivo 03. A primeira que falhar define o motivo.
- Corpo: `payload` bate com `^ACS1:[A-Za-z0-9_-]{22}$`; `latitude` e `longitude` numéricas dentro da faixa; `precisaoMetros` opcional. Payload fora do padrão é 422 (não gera tentativa de credencial). Coordenadas ausentes ou inválidas **dentro de um QR bem formado** → decisão `LOCALIZACAO_INVALIDA`.
- Mais de uma autorização elegível → usar a de `dataFim` mais próxima.
- **Aprovação em uma única transação** via `commitApproval`: (1) consumir a credencial, se `consumidoEm` é nulo, senão `CREDENCIAL_REUTILIZADA`; (2) consumir um uso, se `situacao = ATIVA` e `usosRealizados < usosPermitidos`, senão `USOS_ESGOTADOS`; (3) inserir evento `AUTORIZADO`; (4) inserir comando `ABRIR`.
- **Negação:** evento `NEGADO` com o motivo e, se o terminal foi identificado, comando `NEGAR` com o motivo. O QR **não** é consumido (a pessoa pode se aproximar e tentar de novo dentro da validade).
- 💡 Decisão do plano: requisição sem autenticação (401) não chega ao validador e **não** gera evento; registrar essa decisão num ADR curto.

**Contrato**

Requisição:

```json
{ "payload": "ACS1:q3F8k2Zr1pLw9XbTn0YhVA", "latitude": -23.30512, "longitude": -45.96551, "precisaoMetros": 12.5 }
```

Sucesso 200:

```json
{ "resultado": "AUTORIZADO", "mensagem": "Acesso autorizado. Pode passar.",
  "local": { "nome": "Catraca Social" }, "usosRestantes": 2, "distanciaM": 14, "ocorridoEm": "2026-10-20T14:32:07Z" }
```

Negação 403: `{ "error": { "code": "DISTANTE_DO_TERMINAL", "message": "Você está longe da catraca. Aproxime-se e tente de novo." } }` (mensagens da seção 4.4 do arquivo 03). Outros erros: 401 `UNAUTHORIZED`, 422 `VALIDATION_ERROR`, 429 `RATE_LIMITED`.

**Lista de testes (escrever primeiro; é a maior da lista)**

Unidade, `AccessEvaluator` e `haversineDistanceM`:

- [x] U distância: 99 m passa e 101 m não, com o limite padrão; valor conhecido entre dois pontos de referência.
- [x] U janela: exatamente `horaInicio` e exatamente `horaFim` passam; um minuto antes e um minuto depois não.
- [x] U período: último dia vale; dia seguinte não; antes do início não.
- [x] U várias autorizações: escolhe a de `dataFim` mais próxima entre as elegíveis.

Unidade, `ValidateQrAccess` (um teste por linha):

- [x] U caminho feliz: autoriza, chama `commitApproval` uma vez, devolve `usosRestantes` e `distanceM`.
- [x] U credencial desconhecida → `CREDENCIAL_INVALIDA`; já consumida → `CREDENCIAL_REUTILIZADA`; vencida → `CREDENCIAL_EXPIRADA` (`FakeClock`: T+15 s passa, T+16 s não).
- [x] U terminal ou ponto de acesso inativo → `CREDENCIAL_INVALIDA`.
- [x] U usuário inativo → `USUARIO_INATIVO`.
- [x] U sem autorização para o ponto → `SEM_AUTORIZACAO`; só canceladas → `AUTORIZACAO_CANCELADA`.
- [x] U fora da data ou do horário → `FORA_DO_PERIODO`; sem usos → `USOS_ESGOTADOS`.
- [x] U coordenadas ausentes → `LOCALIZACAO_INVALIDA`; distância acima do limite → `DISTANTE_DO_TERMINAL`.
- [x] U precedência: credencial expirada e usuário inativo ao mesmo tempo → `CREDENCIAL_EXPIRADA` (ordem da tabela).
- [x] U toda negação grava **um** evento `NEGADO` e, com terminal identificado, **um** comando `NEGAR`; nenhuma consome credencial ou uso.
- [x] U `commitApproval` devolvendo `CREDENCIAL_REUTILIZADA` ou `USOS_ESGOTADOS` (corrida perdida) vira a negação correspondente, com evento.
- [x] U `commitApproval` lançando erro → a exceção sobe (500) e nenhum comando `ABRIR` existe.
- [x] U (vindo da B13) `InMemoryAccessGrantRepository.commitApproval` com falha injetada no evento: o uso **não** é consumido e a credencial **não** é marcada (all-or-nothing).

Integração (as colunas U e I da seção 9.1 do arquivo 03):

- [x] I os casos 1 a 12 retornam o status e o `code` certos e gravam **um** evento cada.
- [x] I caso 13: duas requisições simultâneas com o **mesmo** QR → uma 200 e uma 403 `CREDENCIAL_REUTILIZADA`; um uso consumido; dois eventos.
- [x] I duas requisições simultâneas com **QRs diferentes** e um uso restante → uma aprovada e outra `USOS_ESGOTADOS`.
- [x] I usuário inativo com token válido recebe `USUARIO_INATIVO` e o evento é gravado.
- [x] I caso 14: sem token → 401 (sem evento, ver ADR).
- [x] I payload fora do padrão → 422; coordenadas fora da faixa → 422; 11ª validação no minuto → 429.
- [x] I resposta em menos de 500 ms no ambiente local (medir no teste e registrar).
- [x] I (vindo da B13) falha de gravação do evento na aprovação (falha injetada dentro da transação): resposta 500 e `usosRealizados` intacto; falha na gravação do evento numa negação: a resposta continua sendo a negação correta.

**Critérios de aceitação**

- [x] Caminho feliz: autoriza, consome **um** uso, grava **um** evento `AUTORIZADO` e cria o comando `ABRIR`.
- [x] Cada motivo da tabela tem um teste de integração que retorna 403 com o código certo, grava **um** evento `NEGADO` e (quando há terminal) cria o comando `NEGAR`.
- [x] Concorrência 1: duas requisições simultâneas com o **mesmo** QR → só uma aprovada, a outra `CREDENCIAL_REUTILIZADA`.
- [x] Concorrência 2: duas requisições simultâneas com **QRs diferentes** e apenas 1 uso restante → só uma aprovada, a outra `USOS_ESGOTADOS`.
- [x] Limites de horário testados: exatamente `horaInicio` e exatamente `horaFim` passam; um minuto fora, não.
- [x] Distância testada com valores conhecidos (99 m passa e 101 m não, com o limite padrão).
- [x] Usuário inativo com token válido recebe `USUARIO_INATIVO` e o evento é gravado.
- [x] Meta de desempenho: resposta abaixo de 500 ms no ambiente local.
- [x] (vindo da B13) Falha de gravação do evento na aprovação: o uso **não** é consumido e a resposta é 500; falha na gravação do evento numa negação: a resposta continua sendo a negação correta.

**Definição de pronto**

- [x] Os 15 casos de teste da seção 9.1 do arquivo 03 estão automatizados.
- [x] O Swagger traz um exemplo para cada um dos 10 motivos de negação do QR (as 11 verificações usam 10 códigos).
- [ ] Teste manual completo com o terminal virtual ou o físico. _Feito com `curl` e `dev:qr` contra o servidor real (aprovação, reuso, distância, 401, 422 e os comandos que o terminal lê); falta com o terminal do Matheus._
- [ ] Pedro avisado (★).
