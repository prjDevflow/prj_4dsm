# 03 — Domínio, requisitos do backend e contrato da API

Carregue este arquivo ao mexer em qualquer endpoint, DTO, código de erro, regra de negócio, modelo de dados ou variável de ambiente. O contrato vale para os três (Eduardo, Lucas e Pedro): não altere sem alinhar.

Legenda: 📄 exigência do documento oficial do desafio · 💡 decisão ou sugestão do time · ★ entrega que destrava outra pessoa.

## 1. Glossário

| Termo | Significado |
|---|---|
| Terminal de Acesso | Dispositivo na catraca (ESP32 ou simulador). Exibe o QR, lê NFC, sinaliza e abre. Fala com o backend por HTTP com polling |
| Ponto de acesso (`access_point`) | Portaria, porta ou catraca de um edifício. Tem coordenadas |
| Autorização | Permissão de um usuário para um ponto de acesso, com período, horário e número de usos |
| Credencial QR (`qr_credentials`) | Token de uso único emitido pelo backend para um terminal; guardado só como hash |
| Comando | Ordem do backend ao terminal: `ABRIR` ou `NEGAR`. Vive 10 s |
| Evento (`access_events`) | Registro imutável de uma tentativa de acesso, aprovada ou negada |
| Situação efetiva | Situação calculada na leitura: `CANCELADA`, `EXPIRADA`, `ESGOTADA` ou `ATIVA` |

Nomes do plano antigo e nomes no código: `calcularSituacaoEfetiva` = `computeEffectiveStatus`; `AvaliadorDeAcesso` = `AccessEvaluator`; `EventoService` = `AccessEventRecorder`; `obterPosicaoDeReferencia` = `resolveReferencePosition`.

## 2. O que o backend precisa entregar

| Requisito | O backend deve | Etapas |
|---|---|---|
| RF01 Cadastro de usuários 📄 | CRUD de usuários nos perfis `ADMIN`, `CONDOMINO`, `VISITANTE`; senha só como hash; desativar em vez de excluir | B06 |
| RF02 Locais de acesso 📄 | Edifícios, pontos de acesso (portaria, porta, catraca) e terminais, com coordenadas | B07 |
| RF03 Criar autorização 📄 | Oito campos: pessoa, local, data início, data fim, hora início, hora fim, usos permitidos, situação | B08 |
| RF04 Consultar autorizações (admin) 📄 | Filtros pessoa, local, situação, período; paginação | B09 |
| RF05 Cancelar autorização 📄 | Cancelamento lógico, efeito imediato, idempotente | B09 |
| RF06 Histórico 📄 | Consultar tentativas aprovadas e negadas com filtros | B18 |
| RF07 Autenticação 📄 | Login com JWT, RBAC, limite de tentativas | B05 |
| RF08 Minhas autorizações 📄 | Usuário vê só as próprias | B09 |
| RF11 Terminal (parte) 📄 | Identificar o terminal, receber posição e estado (heartbeat) | B07, B11 |
| RF12 QR 📄 | Gerar no backend, trocar a cada 10 s, uso único | B12 |
| RF13 Validação por QR 📄 | Autenticidade, validade, local, situação, usos e proximidade (100 m) | B15 |
| RF14 Validação por NFC 📄 | Tag → usuário → autorização; resposta rápida (até 2 s) | B16, B17 |
| RF15 Liberação / RF16 Negação 📄 | Comando `ABRIR` ou `NEGAR` ao terminal | B14, B15 |
| RF17 Registro do evento 📄 | Exatamente um evento por tentativa | B13 |
| RNF02 Segurança | Hash de senha, segredos no ambiente, HTTPS, autenticação do terminal, validação de entrada, rate limit | B05, B07, B20 |
| RNF03 Confiabilidade | Eventos offline e idempotência | B19 |
| RNF05 Manutenibilidade | Camadas e separação de responsabilidades | todas (arquivo 01) |
| RNF06 Persistência | Banco PostgreSQL em nuvem, migrações versionadas | B02, B04 |
| RNF08 a RNF12 CI/CD | Pipeline com build, lint e testes; deploy após CI verde; monitoramento | B03, B10, B20 |
| RP01 | Node.js, Express e TypeScript (`strict`) | B01 |
| RP10 ⚠️ | **Sem testes automatizados no pipeline o projeto não é aceito** | B03 e todas |
| RP12 | Docker (`Dockerfile` e `docker-compose`) | B02 |

## 3. Decisões adotadas (resolvem as ambiguidades do desafio)

| # | Tema | Decisão |
|---|---|---|
| 1 ⭐ | Regra dos 100 m | Interpretada como **raio máximo de 100 m** (`MAX_DISTANCE_M`, configurável). Dúvida enviada ao professor |
| 2 ⭐ | Origem da posição do terminal | Configurável por `TERMINAL_POSITION_SOURCE`: `GPS_COM_FALLBACK` (padrão), `CADASTRO`, `GPS` |
| 3 ⭐ | Vínculo de tag NFC | O administrador vincula a tag ao usuário (digitando o UID, ou pelo modo de cadastro do terminal, opcional) |
| 4 | Regra dos 100 m no NFC | **Não se aplica** ao NFC (não há geolocalização do celular) |
| 5 | Validade do QR | 10 s + 5 s de tolerância, **uso único**. Dois QRs do mesmo terminal podem estar válidos por poucos segundos (intencional) |
| 6 | Número de usos | Obrigatório, inteiro de 1 a 1000 (sem "ilimitado") |
| 7 | Horário que atravessa a meia-noite | Proibido: `horaFim` maior que `horaInicio` |
| 8 | Fuso | Instantes em UTC; datas e horas da autorização avaliadas em `America/Sao_Paulo`; limites inclusivos |
| 9 | Situações da autorização | Banco guarda `ATIVA` ou `CANCELADA`. `EXPIRADA` e `ESGOTADA` são calculadas |
| 10 | Offline | O terminal **nega** quando está sem rede; ao reconectar envia o lote de eventos negados (B19) |
| 11 | Administração | Só pelo app (sem painel web) |
| 12 | Segurança do NFC | UID clonável é limitação aceita e documentada como risco conhecido |

## 4. Contrato da API

Prefixo `/api/v1`. Ver arquivo `docs/contrato-api.md` e `openapi.yaml` no repositório como fonte final.

### 4.1 Regras gerais

| Tema | Regra |
|---|---|
| IDs | UUID v4 em texto. Exceção: `id` de comando do terminal é inteiro crescente |
| Datas | Instantes em ISO 8601 UTC (`2026-10-20T14:32:07Z`). Data de autorização `YYYY-MM-DD`. Hora `HH:mm` (24 h) |
| Auth do app | `Authorization: Bearer <jwt>` |
| Auth do terminal | `X-Terminal-Id: <uuid>` e `X-Terminal-Key: <chave>` |
| Paginação | `?page=1&pageSize=20` (máximo 100). Resposta `{ "data": [], "page": 1, "pageSize": 20, "total": 134 }` |
| Erro | `{ "error": { "code": "CODIGO", "message": "Texto", "details": [ { "field": "email", "message": "..." } ] } }`; `details` só em validação |
| Status | 200/201 sucesso; 401 sem login ou token inválido; 403 perfil sem permissão **ou acesso negado**; 404; 409 conflito; 422 validação; 429 limite; 500 erro interno |
| Códigos genéricos | `VALIDATION_ERROR`, `CREDENCIAIS_INVALIDAS`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR` |
| Códigos específicos de conflito | `EMAIL_JA_CADASTRADO`, `ULTIMO_ADMIN`, `AUTO_DESATIVACAO`, `LOCAL_COM_AUTORIZACOES_ATIVAS`, `TAG_JA_CADASTRADA` |

### 4.2 Rotas

| Rota | Quem chama | Autenticação | Etapa |
|---|---|---|---|
| `GET /health` | qualquer | pública | B01 |
| `POST /auth/login` | App | pública | B05 |
| `GET /auth/me` | App | JWT | B05 |
| `POST/GET/PATCH /users`, `GET /users/:id` | App (admin) | JWT admin | B06 |
| `POST/GET/PATCH /buildings`, `/access-points` | App (admin) | JWT admin | B07 |
| `POST/GET/PATCH /terminals`, `POST /terminals/:id/rotate-key` | App (admin) | JWT admin | B07 |
| `POST /authorizations`, `GET /authorizations/:id` | App | JWT admin (`GET`: admin ou dono) | B08 |
| `GET /authorizations`, `PATCH /authorizations/:id/cancel`, `GET /me/authorizations` | App | JWT admin / próprio | B09 |
| `POST /terminal/heartbeat` | Terminal | chave do terminal | B11 |
| `POST /terminal/qr` | Terminal | chave do terminal | B12 |
| `GET /terminal/commands`, `POST /terminal/commands/:id/ack` | Terminal | chave do terminal | B14 |
| `POST /access/qr/validate` | App | JWT (qualquer perfil, inclusive inativo) | B15 |
| `POST/GET/PATCH /nfc-tags`, `POST /terminals/:id/enroll-mode` | App (admin) | JWT admin | B16 |
| `POST /terminal/nfc` | Terminal | chave do terminal | B17 |
| `GET /access-events`, `GET /me/access-events` | App | JWT admin / próprio | B18 |
| `POST /terminal/events/batch` | Terminal | chave do terminal | B19 |
| `GET /ready` | monitor | pública | B20 |

### 4.3 Formato do QR Code

```
Payload:    ACS1:<token>
Token:      16 bytes aleatórios em base64url sem preenchimento = 22 caracteres
Exemplo:    ACS1:q3F8k2Zr1pLw9XbTn0YhVA
Expressão:  ^ACS1:[A-Za-z0-9_-]{22}$
```

- Quem gera é o backend; o terminal só exibe. O `terminalId` não vai no payload: o backend descobre o terminal pelo hash do token.
- Banco guarda o SHA-256 (hexadecimal) do token, nunca o token.
- Validade 10 s + 5 s de tolerância (`expiraEm = emitidoEm + 15 s`), uso único.

### 4.4 Códigos de negação e mensagens (campo `message` do app)

| Código | Mensagem |
|---|---|
| `CREDENCIAL_INVALIDA` | Este QR Code não é válido. Aponte para o QR Code da catraca. |
| `CREDENCIAL_EXPIRADA` | Este QR Code expirou. Leia o novo QR Code que aparece na tela. |
| `CREDENCIAL_REUTILIZADA` | Este QR Code já foi usado. Aguarde o próximo e leia de novo. |
| `USUARIO_INATIVO` | Seu cadastro está inativo. Procure a administração. |
| `SEM_AUTORIZACAO` | Você não tem autorização para este local. |
| `AUTORIZACAO_CANCELADA` | Sua autorização foi cancelada. Procure a administração. |
| `FORA_DO_PERIODO` | Sua autorização não vale para esta data ou horário. |
| `USOS_ESGOTADOS` | Você já usou todas as entradas desta autorização. |
| `DISTANTE_DO_TERMINAL` | Você está longe da catraca. Aproxime-se e tente de novo. |
| `LOCALIZACAO_INVALIDA` | Não conseguimos confirmar sua localização. Ative o GPS e tente de novo. |
| `TAG_DESCONHECIDA` | Tag não reconhecida. |
| `TAG_INATIVA` | Tag desativada. |
| `TERMINAL_OFFLINE` | Terminal sem conexão. (só em eventos enviados pelo terminal, B19) |

Sucesso do QR: `"Acesso autorizado. Pode passar."`

### 4.5 Mensagens do terminal

```json
// POST /terminal/heartbeat  (a cada 10 s)
{ "latitude": -23.30512, "longitude": -45.96551, "gpsFix": true, "gpsSimulado": false,
  "firmware": "0.3.0", "uptimeS": 1234, "wifiRssi": -61, "eventosPendentes": 0 }
// resposta
{ "serverTime": "2026-10-20T14:32:07Z",
  "config": { "qrRefreshMs": 10000, "commandPollMs": 1000, "aberturaMs": 5000 } }

// POST /terminal/qr  → resposta
{ "payload": "ACS1:q3F8k2Zr1pLw9XbTn0YhVA", "emitidoEm": "...", "expiraEm": "...", "renovarEmMs": 10000 }
```

```json
// GET /terminal/commands?after=41   (só comandos com menos de 10 s de vida)
{ "commands": [ { "id": 42, "tipo": "ABRIR", "aberturaMs": 5000, "criadoEm": "..." },
                { "id": 43, "tipo": "NEGAR", "motivo": "DISTANTE_DO_TERMINAL", "criadoEm": "..." } ] }

// POST /terminal/commands/42/ack  → 204

// POST /terminal/nfc   (cabeçalho Idempotency-Key: <uuid>)
{ "uid": "04A1B2C3D4", "lidoEm": "2026-10-20T14:32:07Z" }
// resposta 200 em qualquer decisão
{ "resultado": "AUTORIZADO", "aberturaMs": 5000 }
{ "resultado": "NEGADO", "motivo": "TAG_DESCONHECIDA" }
{ "resultado": "CADASTRADA" }
```

UID da tag: hexadecimal, maiúsculo, sem separadores, 8 a 20 caracteres.

## 5. Regras de acesso

### 5.1 Ordem de avaliação do QR (`POST /access/qr/validate`)

A primeira verificação que falhar define o motivo.

| # | Verificação | Motivo se falhar |
|---|---|---|
| 1 | Token (pelo hash) existe em `qr_credentials` | `CREDENCIAL_INVALIDA` |
| 2 | Credencial já consumida | `CREDENCIAL_REUTILIZADA` |
| 3 | Agora passou de `expiraEm` | `CREDENCIAL_EXPIRADA` |
| 4 | Terminal e ponto de acesso ativos | `CREDENCIAL_INVALIDA` |
| 5 | Usuário ativo | `USUARIO_INATIVO` |
| 6 | Existe autorização do usuário para este ponto de acesso | `SEM_AUTORIZACAO` |
| 7 | Há alguma não cancelada | `AUTORIZACAO_CANCELADA` |
| 8 | Alguma dentro de `dataInicio..dataFim` e de `horaInicio..horaFim` (inclusivo, São Paulo) | `FORA_DO_PERIODO` |
| 9 | Alguma com usos restantes | `USOS_ESGOTADOS` |
| 10 | Coordenadas presentes e válidas | `LOCALIZACAO_INVALIDA` |
| 11 | Distância (Haversine) até a posição de referência do terminal no máximo `MAX_DISTANCE_M` | `DISTANTE_DO_TERMINAL` |

Se houver mais de uma autorização elegível, usar a de `dataFim` mais próxima. As verificações 6 a 9 são o `AccessEvaluator`, reaproveitado pelo NFC.

### 5.2 Ordem do NFC (`POST /terminal/nfc`)

1. Terminal em modo de cadastro e prazo vigente: vincula a tag, responde `CADASTRADA`, não consome uso.
2. Tag existe (`TAG_DESCONHECIDA`), tag ativa (`TAG_INATIVA`), usuário ativo (`USUARIO_INATIVO`).
3. `AccessEvaluator` (verificações 6 a 9 acima, sem distância).
4. Consumo do uso e evento na mesma transação. Sempre HTTP 200 com a decisão.

### 5.3 Efeitos de uma decisão

- **Aprovação (transação única):** consumir a credencial (`consumidoEm IS NULL`), consumir um uso (`usosRealizados < usosPermitidos AND situacao = 'ATIVA'`), inserir evento `AUTORIZADO`, inserir comando `ABRIR`. Se qualquer passo falhar, tudo é desfeito. Falha ao gravar o evento → 500 `INTERNAL_ERROR`, uso não consumido.
- **Negação:** inserir evento `NEGADO` com motivo e, se o terminal foi identificado, comando `NEGAR`. O QR **não** é consumido numa negação. Se a gravação do evento falhar, registrar no log e **mesmo assim negar**.
- Credencial desconhecida: evento com `terminalId` nulo e, em `detalhes`, só um prefixo do hash.

### 5.4 Regras puras reutilizáveis

- Situação efetiva, prioridade: `CANCELADA` → `EXPIRADA` (hoje em São Paulo depois de `dataFim`) → `ESGOTADA` (`usosRealizados` maior ou igual a `usosPermitidos`) → `ATIVA`. O último dia vale; o seguinte não.
- Posição de referência do terminal: `GPS_COM_FALLBACK` usa o GPS se `gpsFix` e último contato com menos de `GPS_MAX_AGE_MIN`, senão as coordenadas do ponto; `CADASTRO` usa sempre as do ponto; `GPS` só o GPS (falha se não houver).
- Terminal online: `ultimoContatoEm` há menos de `TERMINAL_ONLINE_WINDOW_S`.

## 6. Permissões

| Recurso | ADMIN | CONDOMINO / VISITANTE |
|---|---|---|
| Usuários, edifícios, pontos, terminais, tags | tudo | 403 |
| Criar, listar, cancelar autorizações | sim | 403 |
| `GET /authorizations/:id` | qualquer | só a própria (de outro: 404) |
| `/me/authorizations`, `/me/access-events` | sim | sim (só os próprios) |
| `POST /access/qr/validate` | sim | sim (inclusive conta inativa, para registrar o evento) |
| `/access-events` | sim | 403 |

## 7. Modelo de dados (resumo)

| Tabela | Campos principais | Restrições |
|---|---|---|
| `users` | id, nome (até 120), email (até 254, minúsculo), senhaHash, perfil, ativo, criadoEm, atualizadoEm | e-mail único |
| `buildings` | id, nome, endereco, latitude, longitude, ativo | — |
| `access_points` | id, buildingId, tipo (`PORTARIA`, `PORTA`, `CATRACA`), nome, identificacao, latitude, longitude, ativo | único (buildingId, identificacao) |
| `terminals` | id, accessPointId, nome, apiKeyHash, ativo, ultimoContatoEm, ultimaLat, ultimaLon, gpsFix, gpsSimulado, firmware, rssi, modoCadastroUsuarioId, modoCadastroAte | accessPointId único |
| `authorizations` | id, usuarioId, accessPointId, dataInicio, dataFim, horaInicio, horaFim, usosPermitidos, usosRealizados (0), situacao, criadoPorId, criadoEm, canceladoPorId, canceladoEm, motivoCancelamento | CHECK: usosRealizados no máximo usosPermitidos; dataFim maior ou igual a dataInicio |
| `nfc_tags` | id, usuarioId, uid, descricao, ativa, criadaEm | uid único |
| `qr_credentials` | id, terminalId, tokenHash, emitidoEm, expiraEm, consumidoEm, consumidoPorId | tokenHash único; índice em expiraEm |
| `terminal_commands` | id (inteiro crescente), terminalId, tipo, motivo, aberturaMs, criadoEm, expiraEm, entregueEm, executadoEm | índice (terminalId, id) |
| `access_events` | id, ocorridoEm, terminalId, accessPointId, usuarioId, authorizationId (quatro anuláveis), metodo (`QR`, `NFC`), resultado, motivo, distanciaM, clientEventId (único, opcional), detalhes (JSON) | índices em ocorridoEm, (usuarioId, ocorridoEm), (accessPointId, ocorridoEm) |

Os CHECK vão em SQL na migração. Eventos são somente inserção.

## 8. Variáveis de ambiente (nomes sugeridos)

| Variável | Padrão | Uso |
|---|---|---|
| `PORT`, `NODE_ENV`, `LOG_LEVEL`, `CORS_ORIGINS` | 3000, development, info, lista | servidor |
| `DATABASE_URL` | — | PostgreSQL (segredo) |
| `JWT_SECRET` (mínimo 32 caracteres), `JWT_EXPIRES_IN` | —, 12h | tokens do app |
| `BCRYPT_COST` | 10 | custo do hash |
| `LOGIN_MAX_PER_MINUTE` | 5 | limite por IP e e-mail |
| `QR_VALIDATE_MAX_PER_MINUTE` | 10 | limite por usuário |
| `QR_TTL_SECONDS`, `QR_TOLERANCE_SECONDS` | 10, 5 | validade do QR |
| `QR_ISSUE_MIN_INTERVAL_S`, `HEARTBEAT_MIN_INTERVAL_S` | 5, 2 | limites por terminal |
| `QR_PURGE_AFTER_HOURS` | 1 | limpeza de credenciais vencidas |
| `MAX_DISTANCE_M` | 100 | raio de proximidade |
| `TERMINAL_POSITION_SOURCE`, `GPS_MAX_AGE_MIN` | GPS_COM_FALLBACK, 10 | posição de referência |
| `TERMINAL_ONLINE_WINDOW_S` | 30 | online ou offline |
| `COMMAND_TTL_SECONDS`, `OPEN_DURATION_MS` | 10, 5000 | comandos |
| `QR_REFRESH_MS`, `COMMAND_POLL_MS` | 10000, 1000 | enviados no heartbeat |
| `ENROLL_MODE_SECONDS`, `NFC_DEBOUNCE_SECONDS` | 60, 3 | NFC |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | — | seed |

Toda variável nova entra em `.env.example` e em `config/env.ts`.

## 9. Casos de teste obrigatórios

Cada linha precisa de teste automatizado (U = unidade com doubles; I = integração com PostgreSQL).

### 9.1 Validação por QR (RF13, RF16, RF17)

| # | Cenário | Esperado | Camada |
|---|---|---|---|
| 1 | Autorização válida, QR vigente, perto | Autorizado, um uso consumido, um evento, comando `ABRIR` | U e I |
| 2 | QR adulterado | `CREDENCIAL_INVALIDA` | U e I |
| 3 | QR expirado | `CREDENCIAL_EXPIRADA` | U e I |
| 4 | QR já usado | `CREDENCIAL_REUTILIZADA` | U e I |
| 5 | Autorização de outro local | `SEM_AUTORIZACAO` | U e I |
| 6 | Autorização cancelada | `AUTORIZACAO_CANCELADA` | U e I |
| 7 | Antes do início ou depois do fim | `FORA_DO_PERIODO` | U e I |
| 8 | Dentro do período, fora do horário | `FORA_DO_PERIODO` | U e I |
| 9 | Usos esgotados | `USOS_ESGOTADOS` | U e I |
| 10 | Distância acima do limite (99 m passa, 101 m não) | `DISTANTE_DO_TERMINAL` | U e I |
| 11 | Coordenadas ausentes ou inválidas | `LOCALIZACAO_INVALIDA` | U e I |
| 12 | Usuário inativo | `USUARIO_INATIVO` | U e I |
| 13 | Duas leituras simultâneas com um uso restante | Só uma aprovada | **I** |
| 14 | Sem autenticação | 401 | I |
| 15 | Qualquer caso acima | Exatamente um evento | U e I |

Mais: dois QRs diferentes com um uso restante → só um aprovado (**I**); `horaInicio` e `horaFim` exatos passam, um minuto fora não.

### 9.2 NFC (RF14)

| # | Cenário | Esperado |
|---|---|---|
| 1 | Tag vinculada, autorização válida | `AUTORIZADO` |
| 2 | Tag desconhecida | `NEGADO` + evento |
| 3 | Tag desativada | `NEGADO` + evento |
| 4 | Autorização cancelada, expirada, esgotada ou de outro local | `NEGADO` com o motivo certo |
| 5 | Leituras repetidas em sequência rápida | Mesma decisão, um só uso e um só evento |
| 6 | Mesma `Idempotency-Key` repetida | Decisão anterior, sem novo consumo |

### 9.3 Administração e resiliência

- Só `ADMIN` cria, cancela e consulta autorizações (403 para os demais).
- Cada filtro da consulta devolve o conjunto certo; usuário só vê as próprias (teste de vazamento: A lendo a de B → 404).
- Cancelamento é imediato e aparece na validação seguinte.
- Lote offline duplicado grava cada evento uma vez; evento `AUTORIZADO` no lote é rejeitado.
