# 06 — Etapas B11 a B15: terminal, QR Code e validação (núcleo do sistema)

Carregue este arquivo quando a etapa atual estiver entre B11 e B15. Leia antes `02-tdd-workflow.md`, e `03-domain-and-contract.md` (seções 4.3 a 4.5 e 5 são a base destas etapas).

Legenda: **U** = unitário (doubles, sem banco) · **I** = integração (supertest + PostgreSQL de testes).

Ordem de construção sugerida dentro do bloco: B11 e B12 (independentes) → B13 → B14 → B15. A B15 só começa com B08, B11, B12, B13 e B14 prontas.

---

### B11 — Heartbeat e posição do terminal (parte do RF11)

- **Depende de:** B07 · **Libera:** B15 (posição de referência); **Pedro (I05, I09) ★**
- **Prazo:** Sprint 2, semana 1 · **Prioridade:** 🔴
- **Objetivo:** o backend sabe se cada terminal está vivo e onde está, e ajusta parâmetros do terminal sem reprogramá-lo.

**Use case** (`src/useCases/TerminalChannel/`): `RegisterHeartbeat`. Regra pura em `entities/rules`: `resolveReferencePosition(terminal, accessPoint, now, config)` (usada pela B15). Port `ITerminalRepository` ganha `updateHeartbeat`.

**Regras**

- `POST /terminal/heartbeat` (autenticado pelo terminal) atualiza `ultimoContatoEm`, `ultimaLat`, `ultimaLon`, `gpsFix`, `gpsSimulado`, `firmware`, `rssi`. Responde `serverTime` (UTC) e `config` (`qrRefreshMs`, `commandPollMs`, `aberturaMs`) vindos do ambiente.
- Valida limites das coordenadas; **ignora** latitude e longitude quando `gpsFix` é falso.
- Limite de 1 heartbeat a cada 2 s por terminal (429). Implementar com `ultimoContatoEm` e `IClock`, assim é testável sem tempo real.
- Posição de referência por `TERMINAL_POSITION_SOURCE`: `GPS_COM_FALLBACK` (padrão) usa o GPS se `gpsFix` e o último contato tem menos de `GPS_MAX_AGE_MIN` (10 min), senão as coordenadas do ponto; `CADASTRO` usa sempre as do ponto; `GPS` só o GPS (falha se não houver).

**Lista de testes**

- [ ] U `resolveReferencePosition` em `GPS_COM_FALLBACK`: com fix e contato recente usa o GPS.
- [ ] U `resolveReferencePosition` em `GPS_COM_FALLBACK`: GPS antigo (mais de 10 min) cai no cadastro; sem fix cai no cadastro.
- [ ] U `resolveReferencePosition` em `CADASTRO`: sempre as coordenadas do ponto.
- [ ] U `resolveReferencePosition` em `GPS`: sem fix ou GPS antigo falha de forma explícita.
- [ ] U `RegisterHeartbeat`: grava contato, firmware, rssi e posição; devolve `serverTime` e `config`.
- [ ] U `RegisterHeartbeat`: com `gpsFix` falso não grava latitude nem longitude.
- [ ] U `RegisterHeartbeat`: segundo heartbeat em menos de 2 s lança 429 (`FakeClock`).
- [ ] I corpo com latitude fora da faixa → 422.
- [ ] I chave inválida → 401.
- [ ] I depois de um heartbeat, `GET /terminals` mostra o terminal online com posição e hora do contato.
- [ ] I sem heartbeat por mais de 30 s o terminal aparece offline (inserir `ultimoContatoEm` antigo no banco).

**Critérios de aceitação**

- [ ] Depois de um heartbeat, `GET /terminals` mostra o terminal online com a posição e a hora do contato.
- [ ] Sem heartbeat por mais de 30 s o terminal aparece offline.
- [ ] A resposta devolve `serverTime` em UTC e o bloco `config`.
- [ ] A função de posição de referência tem teste nos três modos, incluindo "GPS antigo" e "sem fix".
- [ ] Chave inválida → 401.

**Definição de pronto**

- [ ] Testes de integração e unitários da função de posição.
- [ ] Pedro avisado para testar com o terminal de desenvolvimento (★).

---

### B12 — Emissão do QR Code (RF12)

- **Depende de:** B07 · **Libera:** B15; **Pedro (I06) ★**; Lucas e Pedro (QR de teste)
- **Prazo:** Sprint 2, semana 1 · **Prioridade:** 🔴
- **Objetivo:** o backend gera o QR do terminal 📄; o código é substituído a cada 10 s.

**Use cases** (`src/useCases/TerminalChannel/`): `IssueQrCredential` (com Controller), `PurgeExpiredCredentials` (rodado por um job). Ports: `IQrCredentialRepository` (`save`, `findByTokenHash`, `findLastIssuedAt(terminalId)`, `deleteExpiredBefore`), `ISecureRandom`, `IHashProvider.sha256`, `IClock`.

**Regras**

- Gera 16 bytes aleatórios, codifica em base64url (22 caracteres), grava o **SHA-256** do token, `terminalId`, `emitidoEm`, `expiraEm = emitidoEm + QR_TTL_SECONDS (10) + QR_TOLERANCE_SECONDS (5)`. Devolve `payload = "ACS1:" + token`, `emitidoEm`, `expiraEm`, `renovarEmMs` (10000).
- O QR anterior continua válido até a **própria** expiração (no máximo 15 s). Dois QRs válidos por poucos segundos é intencional.
- Limite de 1 QR a cada 5 s por terminal (429), usando `findLastIssuedAt` e o `IClock`.
- Job a cada minuto (`infra/jobs`, iniciado em `server.ts`, nunca em `app.ts`) apaga credenciais vencidas há mais de 1 hora.
- Script de desenvolvimento `npm run dev:qr`: emite um QR para o terminal de dev e imprime o `payload`. **Recusa rodar** com `NODE_ENV=production`. Documentar em `docs/ambiente-dev.md`.

**Lista de testes**

- [ ] U `IssueQrCredential`: o token tem 22 caracteres e o payload bate com `^ACS1:[A-Za-z0-9_-]{22}$`.
- [ ] U `IssueQrCredential`: grava só o hash; nenhum campo salvo contém o token em claro.
- [ ] U `IssueQrCredential`: dois pedidos geram tokens diferentes (com `FixedRandom` em sequência).
- [ ] U `IssueQrCredential`: `expiraEm` menos `emitidoEm` é 15 s por padrão e muda quando a configuração muda.
- [ ] U `IssueQrCredential`: pedido com menos de 5 s do anterior lança 429; com 5 s exatos passa.
- [ ] U `PurgeExpiredCredentials`: apaga só as vencidas há mais de 1 hora (limites com `FakeClock`).
- [ ] I `POST /terminal/qr`: terminal inativo ou chave errada não recebe QR (403 e 401).
- [ ] I resposta traz `payload`, `emitidoEm`, `expiraEm` e `renovarEmMs`.
- [ ] I a linha em `qr_credentials` tem `tokenHash` de 64 caracteres hexadecimais.

**Critérios de aceitação**

- [ ] O token tem 22 caracteres e o payload bate com `^ACS1:[A-Za-z0-9_-]{22}$`.
- [ ] O token em claro **não** é gravado; só o hash.
- [ ] Dois pedidos seguidos geram tokens diferentes.
- [ ] `expiraEm - emitidoEm` é 15 s por padrão e muda se as variáveis mudarem.
- [ ] Pedido com menos de 5 s do anterior → 429.
- [ ] Terminal inativo ou chave errada não recebe QR.

**Definição de pronto**

- [ ] Testes de unicidade, hash, expiração e limite.
- [ ] `dev:qr` documentado em `docs/ambiente-dev.md`.

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

- [ ] U `AccessEventRecorder`: para cada código de motivo do contrato (`it.each` sobre a lista completa) grava **exatamente um** evento `NEGADO` com o motivo.
- [ ] U `AccessEventRecorder`: se o repositório lançar erro, registra no log (com contexto) e **não** propaga; a negação segue.
- [ ] U `AccessEvent.approved`: monta o evento com `metodo`, `distanciaM` e `detalhes` sem token, chave ou senha.
- [ ] U credencial desconhecida: `terminalId` nulo e `detalhes` com prefixo do hash de no máximo 8 caracteres, sem o token.
- [ ] U `InMemoryAccessGrantRepository.commitApproval` com falha injetada no evento: o uso **não** é consumido e a credencial **não** é marcada (all-or-nothing).
- [ ] I falha de gravação do evento na aprovação (falha injetada dentro da transação): resposta 500 e `usosRealizados` intacto.
- [ ] I falha de gravação do evento numa negação: a resposta continua sendo a negação correta.
- [ ] I não existe rota que edite ou apague eventos (`PATCH` e `DELETE` em `/access-events/:id` → 404).

**Critérios de aceitação**

- [ ] Um teste para cada motivo da seção 4.4 do arquivo 03 confirma que **exatamente um** evento foi criado.
- [ ] Simular falha de gravação na aprovação: o uso **não** é consumido e a resposta é 500.
- [ ] Simular falha de gravação na negação: a resposta continua sendo a negação correta.
- [ ] Nenhum evento guarda token, chave ou senha.

**Definição de pronto**

- [ ] Testes unitários do recorder e de integração das duas situações de falha.
- [ ] Tabela "campo × quando é nulo" em `docs/eventos-campos.md` para o Lucas (F12) saber o que esperar.

---

### B14 — Canal de comandos para o terminal (parte de RF15 e RF16)

- **Depende de:** B04, B07 · **Libera:** B15; **Pedro (I08) ★**
- **Prazo:** Sprint 2, semana 2 · **Prioridade:** 🔴
- **Objetivo:** o backend diz ao terminal "abra" ou "negue" depois de validar o acesso pelo app.

**Use cases** (`src/useCases/TerminalChannel/`): `ListPendingCommands`, `AckCommand`. Entidade `TerminalCommand` com fábricas `TerminalCommand.open(...)` e `TerminalCommand.deny(motivo)` (`expiraEm = criadoEm + COMMAND_TTL_SECONDS`, `aberturaMs` da configuração); a criação acontece dentro da transação da B15. Port `ITerminalCommandRepository`: `create`, `listPending(terminalId, after, limit, now)`, `markDelivered`, `markExecuted`.

**Regras**

- `GET /terminal/commands?after=<id>&limit=10`: comandos do terminal, em ordem crescente de `id`, **não expirados** e com `id` maior que `after`. Marca `entregueEm` na primeira entrega (não sobrescreve nas seguintes).
- `POST /terminal/commands/:id/ack` → 204: marca `executadoEm`. Só comandos do próprio terminal (senão 404).
- 🔴 **Segurança:** comando vencido (mais de 10 s) nunca é entregue. Um `ABRIR` não pode abrir a catraca minutos depois.
- 🟢 Opcional, depois do básico: `?wait=15` (espera longa até 15 s ou até chegar comando).
- 🟢 Opcional: endpoint de desenvolvimento para disparar comandos, protegido por `NODE_ENV` diferente de `production`.

**Lista de testes**

- [ ] U `ListPendingCommands`: devolve em ordem crescente de `id`.
- [ ] U `ListPendingCommands`: comando com 10 s de vida ainda é entregue; com mais de 10 s não (`FakeClock`).
- [ ] U `ListPendingCommands`: `after` evita reentrega; `limit` é respeitado.
- [ ] U `ListPendingCommands`: nunca devolve comandos de outro terminal.
- [ ] U `ListPendingCommands`: `entregueEm` é marcado na primeira entrega e preservado depois.
- [ ] U `AckCommand`: marca `executadoEm`; comando de outro terminal → `NotFoundError`.
- [ ] U `TerminalCommand.open` e `deny`: `expiraEm`, `aberturaMs` e `motivo` corretos.
- [ ] I `GET /terminal/commands` sem cabeçalhos do terminal → 401.
- [ ] I comando criado aparece na consulta seguinte (dentro de 1 s).
- [ ] I `POST .../ack` devolve 204 e `ack` de comando alheio devolve 404.

**Critérios de aceitação**

- [ ] Comando criado aparece em até 1 s na próxima consulta do terminal.
- [ ] Comando com mais de 10 s não é entregue.
- [ ] Um terminal nunca vê comandos de outro.
- [ ] `after` evita reentrega de comandos já vistos.
- [ ] `ack` de comando alheio → 404.

**Definição de pronto**

- [ ] Testes de ordem, expiração, isolamento entre terminais e `ack`.
- [ ] Pedro avisado do formato exato (seção 4.5 do arquivo 03) e do endpoint de teste de desenvolvimento, se existir.

---

### B15 — Validação de acesso por QR Code (RF13, RF15, RF16, RF17)

- **Depende de:** B08, B11, B12, B13, B14 · **Libera:** B17 (reaproveita o avaliador); **Lucas (F11) ★**; teste ponta a ponta com Pedro
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

- [ ] U distância: 99 m passa e 101 m não, com o limite padrão; valor conhecido entre dois pontos de referência.
- [ ] U janela: exatamente `horaInicio` e exatamente `horaFim` passam; um minuto antes e um minuto depois não.
- [ ] U período: último dia vale; dia seguinte não; antes do início não.
- [ ] U várias autorizações: escolhe a de `dataFim` mais próxima entre as elegíveis.

Unidade, `ValidateQrAccess` (um teste por linha):

- [ ] U caminho feliz: autoriza, chama `commitApproval` uma vez, devolve `usosRestantes` e `distanceM`.
- [ ] U credencial desconhecida → `CREDENCIAL_INVALIDA`; já consumida → `CREDENCIAL_REUTILIZADA`; vencida → `CREDENCIAL_EXPIRADA` (`FakeClock`: T+15 s passa, T+16 s não).
- [ ] U terminal ou ponto de acesso inativo → `CREDENCIAL_INVALIDA`.
- [ ] U usuário inativo → `USUARIO_INATIVO`.
- [ ] U sem autorização para o ponto → `SEM_AUTORIZACAO`; só canceladas → `AUTORIZACAO_CANCELADA`.
- [ ] U fora da data ou do horário → `FORA_DO_PERIODO`; sem usos → `USOS_ESGOTADOS`.
- [ ] U coordenadas ausentes → `LOCALIZACAO_INVALIDA`; distância acima do limite → `DISTANTE_DO_TERMINAL`.
- [ ] U precedência: credencial expirada e usuário inativo ao mesmo tempo → `CREDENCIAL_EXPIRADA` (ordem da tabela).
- [ ] U toda negação grava **um** evento `NEGADO` e, com terminal identificado, **um** comando `NEGAR`; nenhuma consome credencial ou uso.
- [ ] U `commitApproval` devolvendo `CREDENCIAL_REUTILIZADA` ou `USOS_ESGOTADOS` (corrida perdida) vira a negação correspondente, com evento.
- [ ] U `commitApproval` lançando erro → a exceção sobe (500) e nenhum comando `ABRIR` existe.

Integração (as colunas U e I da seção 9.1 do arquivo 03):

- [ ] I os casos 1 a 12 retornam o status e o `code` certos e gravam **um** evento cada.
- [ ] I caso 13: duas requisições simultâneas com o **mesmo** QR → uma 200 e uma 403 `CREDENCIAL_REUTILIZADA`; um uso consumido; dois eventos.
- [ ] I duas requisições simultâneas com **QRs diferentes** e um uso restante → uma aprovada e outra `USOS_ESGOTADOS`.
- [ ] I usuário inativo com token válido recebe `USUARIO_INATIVO` e o evento é gravado.
- [ ] I caso 14: sem token → 401 (sem evento, ver ADR).
- [ ] I payload fora do padrão → 422; coordenadas fora da faixa → 422; 11ª validação no minuto → 429.
- [ ] I resposta em menos de 500 ms no ambiente local (medir no teste e registrar).

**Critérios de aceitação**

- [ ] Caminho feliz: autoriza, consome **um** uso, grava **um** evento `AUTORIZADO` e cria o comando `ABRIR`.
- [ ] Cada motivo da tabela tem um teste de integração que retorna 403 com o código certo, grava **um** evento `NEGADO` e (quando há terminal) cria o comando `NEGAR`.
- [ ] Concorrência 1: duas requisições simultâneas com o **mesmo** QR → só uma aprovada, a outra `CREDENCIAL_REUTILIZADA`.
- [ ] Concorrência 2: duas requisições simultâneas com **QRs diferentes** e apenas 1 uso restante → só uma aprovada, a outra `USOS_ESGOTADOS`.
- [ ] Limites de horário testados: exatamente `horaInicio` e exatamente `horaFim` passam; um minuto fora, não.
- [ ] Distância testada com valores conhecidos (99 m passa e 101 m não, com o limite padrão).
- [ ] Usuário inativo com token válido recebe `USUARIO_INATIVO` e o evento é gravado.
- [ ] Meta de desempenho: resposta abaixo de 500 ms no ambiente local.

**Definição de pronto**

- [ ] Os 15 casos de teste da seção 9.1 do arquivo 03 estão automatizados.
- [ ] O Swagger traz um exemplo para cada um dos 10 motivos de negação do QR (as 11 verificações usam 10 códigos).
- [ ] Teste manual completo com o terminal virtual ou o físico.
- [ ] Lucas avisado (★).
