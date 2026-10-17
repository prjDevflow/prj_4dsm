# 07 — Etapas B16 a B20: NFC, histórico, eventos offline e fechamento

Carregue este arquivo quando a etapa atual estiver entre B16 e B20. Leia antes `02-tdd-workflow.md`. O avaliador de acesso e a aprovação atômica já existem desde a B15: **reaproveite**, não duplique.

Legenda: **U** = unitário (doubles, sem banco) · **I** = integração (supertest + PostgreSQL de testes).

---

### B16 — Tags NFC: vínculo com usuários (apoio ao RF10)

- **Depende de:** B06, B07 · **Libera:** B17; Lucas (F13); Pedro (I10, I11)
- **Prazo:** Sprint 3, semana 1 (início) · **Prioridade:** 🔴
- **Objetivo:** o documento não diz como a tag é associada a uma pessoa (ambiguidade 3). O administrador vincula a tag.

**Use cases** (`src/useCases/Nfc/`): `CreateNfcTag`, `ListNfcTags`, `UpdateNfcTag`, 🟢 `EnableEnrollMode`. Regra pura `normalizeUid` em `entities/rules`. Port `INfcTagRepository` (`save`, `findByUid`, `list`, `update`).

**Regras**

- `POST /nfc-tags` `{ usuarioId, uid, descricao? }`: normaliza o UID (remove `:`, `-` e espaços, converte para maiúsculas, só hexadecimal, 8 a 20 caracteres). UID repetido → 409 `TAG_JA_CADASTRADA`. 💡 O usuário precisa existir (404) e estar ativo (422).
- `GET /nfc-tags` (filtros `usuarioId`, `ativa`) e `PATCH /nfc-tags/:id` (ativar ou desativar). Sem exclusão.
- 🟢 **Modo de cadastro pelo terminal (opcional):** `POST /terminals/:id/enroll-mode` `{ usuarioId }` grava `modoCadastroUsuarioId` e `modoCadastroAte = agora + 60 s` (`ENROLL_MODE_SECONDS`). A próxima leitura NFC naquele terminal vincula a tag (feito na B17).
- Se faltar tempo, entregar só os dois primeiros itens: o administrador digita o UID no app (F13); o UID aparece na serial do terminal (I10).

**Lista de testes**

- [ ] U `normalizeUid`: `04:a1:b2:c3` e `04A1B2C3` resultam em `04A1B2C3`; também com hífens e espaços.
- [ ] U `normalizeUid`: caractere não hexadecimal, 7 caracteres e 21 caracteres são rejeitados; 8 e 20 passam.
- [ ] U `CreateNfcTag`: grava o UID normalizado e `ativa: true`.
- [ ] U `CreateNfcTag`: UID duplicado, mesmo escrito de outro jeito, lança 409 `TAG_JA_CADASTRADA`.
- [ ] U `CreateNfcTag`: usuário inexistente → 404; inativo → 422.
- [ ] U `UpdateNfcTag`: desativar e reativar; tag inexistente → 404.
- [ ] U `EnableEnrollMode` (se feito): grava prazo de 60 s e o modo expira sozinho (`FakeClock` T+61 s).
- [ ] I UID inválido → 422; tag duplicada → 409; só `ADMIN` acessa (403 para os demais).
- [ ] I filtros `usuarioId` e `ativa` da listagem.

**Critérios de aceitação**

- [ ] `04:a1:b2:c3` e `04A1B2C3` resultam no mesmo UID salvo.
- [ ] UID com caracteres inválidos ou tamanho errado → 422.
- [ ] Tag duplicada → 409.
- [ ] Desativar a tag impede o uso (verificado na B17).
- [ ] Só `ADMIN` acessa.
- [ ] (Opcional) o modo de cadastro expira sozinho em 60 s.

**Definição de pronto**

- [ ] Testes de normalização, duplicidade, desativação e perfil.
- [ ] Swagger atualizado; Lucas avisado (★).

---

### B17 — Validação de acesso por NFC (RF14)

- **Depende de:** B15, B16 · **Libera:** **Pedro (I11) ★**; B19
- **Prazo:** Sprint 3, semana 1 · **Prioridade:** 🔴
- **Objetivo:** o terminal envia o UID lido e recebe a decisão na própria resposta.

**Use case** (`src/useCases/Nfc/`): `ValidateNfcAccess`. Reusa `AccessEvaluator`, `IAccessGrantRepository` (a aprovação consome só o uso, sem credencial de QR: estenda o port com uma variante `commitNfcApproval` ou torne `credentialId` opcional, mantendo a mesma transação), `AccessEventRecorder` e `normalizeUid`.

**Regras**

- `POST /terminal/nfc` (autenticado pelo terminal) com cabeçalho `Idempotency-Key` (UUID).
- Normaliza o UID. **Se o terminal está em modo de cadastro** e o prazo não venceu: vincula a tag ao usuário combinado, responde `{ "resultado": "CADASTRADA" }`, não consome uso e não registra acesso.
- Senão, nesta ordem: tag existe (`TAG_DESCONHECIDA`), tag ativa (`TAG_INATIVA`), usuário ativo (`USUARIO_INATIVO`), depois o **mesmo `AccessEvaluator` da B15** (itens 6 a 9, **sem distância**: a regra dos 100 m é do QR).
- Consumo do uso e evento `NFC` na mesma transação.
- **Idempotência** 💡: a `Idempotency-Key` fica em `access_events.clientEventId`; repetir a mesma chave devolve a decisão anterior, sem novo consumo nem novo evento. Leitura da mesma tag no mesmo terminal em menos de 3 s (`NFC_DEBOUNCE_SECONDS`, procurando o último evento do terminal com o mesmo UID em `detalhes`) também devolve a decisão anterior.
- Resposta **sempre 200** com a decisão (`AUTORIZADO` com `aberturaMs`, ou `NEGADO` com `motivo`). Meta: até 2 s.

**Lista de testes**

- [ ] U tag válida com autorização válida → `AUTORIZADO` com `aberturaMs`, um uso consumido, um evento `NFC`.
- [ ] U tag desconhecida → `NEGADO` `TAG_DESCONHECIDA`; tag desativada → `TAG_INATIVA`; usuário inativo → `USUARIO_INATIVO` (um evento cada).
- [ ] U autorização cancelada, fora do período, usos esgotados e de outro local → `NEGADO` com o motivo certo, um evento cada.
- [ ] U a distância **não** é avaliada (nenhuma coordenada é exigida).
- [ ] U mesma `Idempotency-Key` repetida → decisão anterior, sem novo consumo e sem novo evento.
- [ ] U mesma tag no mesmo terminal em menos de 3 s → decisão anterior; a partir de 3 s é nova tentativa (`FakeClock`).
- [ ] U modo de cadastro vigente → `CADASTRADA`, tag vinculada, nenhum uso consumido, nenhum evento de acesso.
- [ ] U modo de cadastro vencido → segue o fluxo normal.
- [ ] I `POST /terminal/nfc` sem cabeçalhos do terminal → 401; terminal inativo → 403; UID inválido → 422.
- [ ] I duas leituras simultâneas com um uso restante → só uma `AUTORIZADO`.
- [ ] I resposta em até 2 s.

**Critérios de aceitação**

- [ ] Tag válida com autorização válida → `AUTORIZADO` com `aberturaMs`, um uso consumido, um evento `NFC`.
- [ ] Tag desconhecida, desativada, usuário inativo, autorização cancelada, fora do período e usos esgotados → `NEGADO` com o código certo e um evento cada.
- [ ] Repetir a mesma `Idempotency-Key` não consome outro uso.
- [ ] Resposta em até 2 s no ambiente de homologação.
- [ ] Modo de cadastro vincula a tag, responde `CADASTRADA` e não registra acesso.

**Definição de pronto**

- [ ] Os casos NFC da seção 9.2 do arquivo 03 estão automatizados, inclusive a idempotência.
- [ ] Pedro avisado (★).

---

### B18 — Histórico de acessos (RF06)

- **Depende de:** B13 · **Libera:** Lucas (F12)
- **Prazo:** Sprint 3, semana 1 · **Prioridade:** 🟡
- **Objetivo:** consultar as tentativas, aprovadas e negadas, com filtros.

**Use cases** (`src/useCases/Events/`): `ListAccessEvents`, `ListMyAccessEvents`. Port `IAccessEventRepository.list(filtros)` devolve um read model com nomes já resolvidos.

**Regras**

- `GET /access-events` (admin): filtros `usuarioId`, `accessPointId`, `terminalId`, `metodo`, `resultado`, `motivo`, `de`, `ate`; paginação; do mais recente para o mais antigo.
- `GET /me/access-events`: apenas os eventos do usuário do token (ignora `usuarioId` da query).
- Resposta com usuário, local e edifício já resolvidos, para o app não fazer várias chamadas. Evento sem usuário identificado traz `usuario: null`.
- Conferir os índices da B04 com volume de teste (10 mil eventos).

**Lista de testes**

- [ ] U `ListMyAccessEvents`: usa sempre o id do token.
- [ ] I cada filtro funciona isolado e combinado (um teste por filtro).
- [ ] I eventos aprovados e negados aparecem; os negados trazem o `motivo`.
- [ ] I usuário comum só enxerga os próprios em `/me/access-events` e recebe 403 em `/access-events`.
- [ ] I evento sem usuário (credencial desconhecida) aparece com `usuario: null`.
- [ ] I com 10 mil eventos (criados em lote no teste) uma página volta em menos de 300 ms.
- [ ] I não existe rota que altere ou apague eventos.

**Critérios de aceitação**

- [ ] Cada filtro funciona isolado e combinado.
- [ ] Eventos aprovados e negados aparecem; os negados trazem o `motivo`.
- [ ] Usuário comum só enxerga os próprios (`/me/access-events`) e recebe 403 em `/access-events`.
- [ ] Com 10 mil eventos, uma página é devolvida em menos de 300 ms localmente.
- [ ] Não existe rota que altere ou apague eventos.

**Definição de pronto**

- [ ] Testes por filtro e de isolamento entre usuários; Swagger atualizado.

---

### B19 — Eventos offline e idempotência (RNF03)

- **Depende de:** B13, B17 · **Libera:** **Pedro (I12) ★**
- **Prazo:** Sprint 3, semana 1 · **Prioridade:** 🟡
- **Objetivo:** quando o terminal perde a conexão, guarda as tentativas e envia depois, sem duplicar e sem "forjar" aprovações.

**Use case** (`src/useCases/Events/`): `IngestOfflineEvents`.

**Regras**

- `POST /terminal/events/batch` com até 50 eventos: `{ "events": [ { "clientEventId": "uuid", "metodo": "NFC", "uid": "04A1B2C3", "ocorridoEm": "...", "resultado": "NEGADO", "motivo": "TERMINAL_OFFLINE" } ] }`. Autenticado pelo terminal.
- Idempotência pelo `clientEventId` (único): duplicados são ignorados e contados. Resposta `{ "aceitos": 3, "duplicados": 1 }`.
- **Aceitar apenas `NEGADO`**: offline o terminal nega; ele não pode enviar aprovação (nenhum uso foi consumido). `AUTORIZADO` → 422.
- `ocorridoEm` no máximo 5 minutos no futuro e no máximo 7 dias no passado (relógio injetado). Requisição com mais de 64 kb → 413 `PAYLOAD_TOO_LARGE` 💡 (proposta; registrar no contrato). Mais de 50 eventos → 422.
- Erro de validação em qualquer evento rejeita o lote inteiro com 422 e `details` indicando o índice; **duplicado não é erro** (só é contado). "Lote parcial" nos testes = lote com parte nova e parte já recebida.
- Tenta identificar a tag (UID → usuário) para preencher `usuarioId`.

**Lista de testes**

- [ ] U enviar o mesmo lote duas vezes grava cada evento uma única vez (`aceitos` e `duplicados` corretos).
- [ ] U lote parcial: 3 novos e 1 já recebido → `aceitos: 3`, `duplicados: 1`.
- [ ] U evento `AUTORIZADO` é rejeitado com erro de validação.
- [ ] U `ocorridoEm` 6 minutos no futuro e 8 dias no passado são rejeitados; 5 minutos e 7 dias passam (`FakeClock`).
- [ ] U UID conhecido preenche `usuarioId`; UID desconhecido deixa nulo.
- [ ] I lote com 51 eventos → 422; corpo acima de 64 kb → 413.
- [ ] I chave de terminal inválida → 401.
- [ ] I o histórico (B18) mostra os eventos offline com `motivo = TERMINAL_OFFLINE`.

**Critérios de aceitação**

- [ ] Enviar o mesmo lote duas vezes grava cada evento uma única vez.
- [ ] Evento com `resultado = AUTORIZADO` é rejeitado (422).
- [ ] Data fora da janela é rejeitada.
- [ ] O histórico (B18) mostra os eventos offline com o motivo `TERMINAL_OFFLINE`.

**Definição de pronto**

- [ ] Testes de duplicidade, lote parcial e limites; Pedro avisado (★).

---

### B20 — Segurança, monitoramento e documentação final (RNF02, RNF12, RP07)

- **Depende de:** B18, B19 (e todas as anteriores) · **Libera:** entrega final
- **Prazo:** Sprint 3, semana 2 · **Prioridade:** 🟡
- **Objetivo:** fechar as pendências de segurança, ter visibilidade em produção e entregar a documentação do backend.

**Use case:** `Health/GetReadiness` (`GET /ready`: confere o banco; 503 se estiver fora). O restante é revisão transversal.

**Segurança (cada item com evidência: print ou comando)**

- [ ] `helmet` e origens do CORS revisados; HTTPS obrigatório (HSTS em produção).
- [ ] Limites de requisição revisados em todas as rotas públicas e de terminal.
- [ ] Validação de entrada conferida em **todas** as rotas.
- [ ] Varredura de segredos no repositório e `npm audit` no CI.
- [ ] Logs sem dados sensíveis; erros sem stack trace em produção.
- [ ] Procedimento de troca do `JWT_SECRET` e da chave do terminal documentado.

**Monitoramento:** logs estruturados; `/health` e `/ready`; aviso de queda (monitor de disponibilidade gratuito ou notificação do pipeline); selo do CI/CD no README.

**Documentação (RP07):** OpenAPI completo, diagrama ER, diagramas de sequência (QR e NFC), seção "Backend" do documento de arquitetura, descrição da comunicação com terminal e app, plano de testes e relatório de execução, instruções de backup e restauração do banco.

**Lista de testes**

- [ ] U `GetReadiness`: banco fora → não pronto; banco no ar → pronto.
- [ ] I `GET /ready`: 200 com o banco no ar.
- [ ] I cabeçalhos de segurança do `helmet` presentes; com `NODE_ENV=production`, `Strict-Transport-Security` presente.
- [ ] I CORS recusa origem fora da lista.
- [ ] I teste genérico: percorre todas as rotas registradas com corpo inválido e espera 422 (nenhuma rota sem validação).
- [ ] I toda rota de terminal e pública tem limite de requisição (429 ao exceder).
- [ ] I resposta de erro 500 em produção não contém stack nem mensagem interna.
- [ ] Verificação manual: parar o banco e conferir o alerta em até 5 minutos.

**Critérios de aceitação**

- [ ] A lista de segurança está toda marcada, com evidência (print ou comando) para cada item.
- [ ] Parar o banco gera alerta visível em até 5 minutos.
- [ ] Uma pessoa de fora consegue subir e testar o sistema só com o README.

**Definição de pronto**

- [ ] Documentos revisados por Lucas e Pedro.
- [ ] Relatório de cobertura de testes anexado.

---

## Checklist final do backend

- [ ] B01 a B20 concluídas, cada uma com critérios e DoD atendidos.
- [ ] CI e CD verdes; homologação no ar; Swagger completo.
- [ ] Testes cobrem os 15 casos de QR e os 6 de NFC, mais concorrência e idempotência.
- [ ] Documentação do backend (OpenAPI, ER, sequências, comunicação, segurança) entregue.
