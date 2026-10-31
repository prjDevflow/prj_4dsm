# 06 — Etapas F05 a F08: administração (usuários, locais, terminais e autorizações)

Carregue este arquivo quando a etapa atual estiver entre F05 e F08. São as telas do administrador (escala compacta do Figma: corpo 16, botões 48).

Legenda: 📄 exigência do documento oficial do desafio · 💡 decisão ou sugestão do time (pode mudar) · ★ entrega que destrava outra pessoa · ❓ pergunta em aberto (lista no [STATUS.md](STATUS.md)) · 🔴 essencial · 🟡 importante · 🟢 pode ser cortada se faltar tempo.

---

### F05 — Administração: usuários (RF01)

- **Depende de:** F04; B06 ✅ · **Libera:** F07, F13
- **Prazo:** 13/11 · **Prioridade:** 🔴 · **Telas:** [T15 Lista](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-114), [T16 Cadastro e edição](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-178)
- **Objetivo:** o administrador lista, cadastra, edita e desativa usuários.

**Contrato** (`openapi.yaml`): `GET /users?perfil=&ativo=&q=&page=&pageSize=` (ordenado por nome); `POST /users` com `{ nome, email, perfil, senha }`; `GET /users/:id`; `PATCH /users/:id` com um ou mais de `nome`, `perfil`, `ativo`, `senha` (**o e-mail não muda**: enviá-lo dá 422). Conflitos 409: `EMAIL_JA_CADASTRADO`, `AUTO_DESATIVACAO`, `ULTIMO_ADMIN`. Senha de 8 a 72 bytes.

**Elementos**

| Tela | Elementos e regras |
|---|---|
| T15 | Busca "Buscar por nome ou e-mail" (envia 400 ms depois de parar de digitar, `q`); filtros "Todos", "Administrador", "Condômino", "Visitante"; interruptor "Mostrar usuários inativos" (desligado = `ativo=true`); item com nome, e-mail, selo do perfil e selo "Inativo"; rolagem infinita (`useInfiniteQuery`, `page`/`pageSize`); puxar para atualizar; vazio "Nenhum usuário encontrado."; botão "Novo usuário" |
| T16 | Nome completo (3 a 120; "Informe o nome completo (mínimo 3 letras)."); E-mail ("Digite um e-mail válido."; somente leitura na edição); Perfil ("Escolha um perfil."); Senha (criação: obrigatória, 8 a 72, "A senha precisa ter pelo menos 8 caracteres."; edição: "Nova senha (opcional)"); Confirmar senha ("As senhas não são iguais."); interruptor "Usuário ativo" só na edição; "Salvar" ("Salvando…") e "Cancelar" (com alteração: "Descartar alterações?" com "Continuar editando" e "Descartar") |

| Erro da API | Onde aparece | Texto |
|---|---|---|
| 409 `EMAIL_JA_CADASTRADO` | no campo E-mail | Este e-mail já está cadastrado. |
| 409 `AUTO_DESATIVACAO` | faixa | Você não pode desativar a si mesmo. |
| 409 `ULTIMO_ADMIN` | faixa | ❓ 8 (sugestão: "O sistema precisa de pelo menos um administrador ativo.") |
| 422 com `details` | no campo de cada `field` | a `message` do detalhe |

No PATCH, envie **só os campos que mudaram**, e nunca o `email`.

**Lista de testes**

- [ ] U schema: cada mensagem de campo; senha obrigatória na criação e opcional na edição; confirmação diferente impede o envio.
- [ ] U model da lista: busca com atraso de 400 ms, filtro de perfil e inativos combinados na consulta; carrega a página seguinte.
- [ ] U model do formulário: 409 `EMAIL_JA_CADASTRADO` vira erro no campo E-mail; `details` do 422 vão para os campos certos.
- [ ] U model do formulário: PATCH só com os campos alterados e sem `email`.
- [ ] U serviços (MSW): parâmetros da consulta e corpos de POST e PATCH.

**Critérios de aceitação**

- [ ] Usuário criado aparece na lista logo em seguida (invalidação da consulta).
- [ ] E-mail repetido mostra o erro no campo E-mail.
- [ ] Desativar a si mesmo mostra a mensagem amigável.
- [ ] Busca, filtro e paginação funcionam juntos.

**Definição de pronto**

- [ ] Testado com a API real (seed).

---

### F06 — Administração: locais e terminais (RF02, RF11)

- **Depende de:** F04; **B07** (e B11 para o "Online") · **Libera:** F07; Matheus (cadastrar o terminal pelo app) ★
- **Prazo:** 15/11 · **Prioridade:** 🔴
- **Telas:** [T17 Locais e terminais](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-221), [T18 Edifício](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-304), [T19 Ponto de acesso](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-345), [T20 Terminais](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-404), [T21 Terminal](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-453), [T22 Chave](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-486)
- **Objetivo:** o administrador cadastra edifícios, pontos de acesso e terminais.

**Contrato** (de `05-steps-B06-B10.md`, B07; ❓ 5): `POST/GET/PATCH /buildings` (nome, endereco, latitude, longitude, ativo); `POST/GET/PATCH /access-points` (buildingId, tipo `PORTARIA`/`PORTA`/`CATRACA`, nome, identificacao única por edifício, latitude, longitude, ativo); `POST/GET/PATCH /terminals` (accessPointId, um terminal por ponto: 409 `CONFLICT`); `POST /terminals` devolve `{ id, apiKey }` e a **`apiKey` só aparece nessa resposta**; `POST /terminals/:id/rotate-key` gera outra e invalida a antiga. `GET /terminals` informa online/offline (contato há menos de 30 s). Desativar local com autorização ativa: 409 `LOCAL_COM_AUTORIZACOES_ATIVAS`.

**Elementos**

| Tela | Elementos e regras |
|---|---|
| T17 | Edifícios em cartões com os pontos de acesso embaixo (tipo, nome, identificação, selo Ativo/Inativo); "Novo edifício", "Novo ponto de acesso", "Terminais" |
| T18 | Nome e Endereço (obrigatórios), Latitude (-90 a 90, "Latitude inválida."), Longitude (-180 a 180, "Longitude inválida."), botão "Usar minha localização atual" ("Obtendo localização…"; negada: "Não foi possível obter a localização. Digite as coordenadas."), interruptor "Ativo", "Salvar", "Cancelar" |
| T19 | Edifício (seleção), Tipo (segmentado: Portaria, Porta, Catraca), Nome, Identificação (exemplo "CAT-01"), Latitude, Longitude, "Usar minha localização atual", "Ativo" |
| T20 | Nome, ponto de acesso, selo "Online"/"Offline", "Visto há {tempo}", posição (se houver); "Novo terminal" |
| T21 | Nome e ponto de acesso (só os que ainda não têm terminal); no detalhe, "Gerar nova chave" com a confirmação "A chave antiga deixará de funcionar. Continuar?" e o interruptor "Ativo" |
| T22 | "Anote esta chave agora. Ela não será mostrada de novo.", chave em campo somente leitura, "Copiar chave" (`expo-clipboard`), "Concluir". A chave **não** fica no cache do TanStack Query nem em log; saiu da tela, sumiu |

Coordenadas: aceite vírgula ou ponto na digitação e envie número (❓ 9).

**Lista de testes**

- [ ] U schema: limites de latitude e longitude (−90, 90, −180, 180 passam; 90,0001 não); vírgula decimal convertida.
- [ ] U model "Usar minha localização": preenche os dois campos; permissão negada mostra a mensagem.
- [ ] U model do terminal: a chave da resposta aparece na T22 e não é guardada em nenhum outro lugar.
- [ ] U model: 409 `LOCAL_COM_AUTORIZACOES_ATIVAS` mostra "Este local ainda tem autorizações ativas. Cancele-as antes."
- [ ] U tela T20: selo Online/Offline e "Visto há" com relógio controlado no teste.

**Critérios de aceitação**

- [ ] Dá para criar edifício → ponto de acesso → terminal em sequência, só pelo app.
- [ ] A chave aparece uma única vez e "Copiar chave" funciona.
- [ ] O selo Online/Offline acompanha o terminal ligado e desligado (com a B11 pronta).

**Definição de pronto**

- [ ] O Matheus cadastrou o terminal dele pelo app e o terminal entrou online com a chave copiada.

---

### F07 — Administração: nova autorização (RF03)

- **Depende de:** F05, F06; **B08** · **Libera:** F08
- **Prazo:** 16/11 · **Prioridade:** 🔴 · **Telas:** [T24 Nova autorização](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-153)
- **Objetivo:** criar uma autorização com os campos exigidos (📄 RF03) sem confusão.

**Contrato** (de `05-steps-B06-B10.md`, B08): `POST /authorizations` com `{ usuarioId, accessPointId, dataInicio, dataFim, horaInicio, horaFim, usosPermitidos }` → 201 com o objeto completo (ver F09 em `05-steps-F09-F11.md`). Regras do servidor: usuário e local ativos (inativo → 422 no campo); `dataFim` ≥ `dataInicio` e não no passado (São Paulo); `horaFim` > `horaInicio`; usos de 1 a 1000.

**Elementos**

| # | Campo | Regra | Mensagem |
|---|---|---|---|
| 1 | Pessoa | seleção com busca, só usuários ativos (nome e perfil) | Escolha a pessoa. |
| 2 | Local de acesso | seleção agrupada por edifício, só pontos ativos | Escolha o local. |
| 3 | Data inicial | padrão hoje | Informe a data inicial. |
| 4 | Data final | não antes da inicial | A data final não pode ser antes da inicial. |
| 5 | Horário inicial | padrão 08:00 | Informe o horário inicial. |
| 6 | Horário final | padrão 18:00, depois do inicial | O horário final precisa ser depois do inicial. |
| 7 | Número de utilizações | `NumberStepper` de 1 a 1000, padrão 1 | Informe de 1 a 1000 entradas. |
| 8 | Atalhos | "Só hoje" e "Próximos 7 dias" preenchem as datas | — |
| 9 | Resumo | "Maria Souza poderá entrar na Catraca Social do Edifício Central de 20/10/2026 a 25/10/2026, das 08:00 às 18:00, até 3 vezes." | — |
| 10 | Botões | "Criar autorização" ("Criando…") e "Cancelar" (pergunta antes de descartar) | — |

Não há campo "situação": toda autorização nasce ativa. Sem pessoas ou locais cadastrados, o seletor explica e leva ao cadastro em vez de abrir vazio. Depois de criar: aviso "Autorização criada." e volta à lista (F08) com a nova no topo. 404 de pessoa ou local → "A pessoa ou o local não existe mais. Atualize a tela."; 422 → mensagem no campo de cada `details`.

**Lista de testes**

- [ ] U schema: cada mensagem; `dataFim` igual à inicial passa; `horaFim` igual à inicial é recusada; 0 e 1001 recusados.
- [ ] U `buildSummary`: o resumo bate exatamente com o que será enviado (inclusive "1 vez" e "3 vezes").
- [ ] U atalhos "Só hoje" e "Próximos 7 dias" com relógio controlado no teste.
- [ ] U model: envia os campos com os nomes do contrato; 422 vai para o campo certo.

**Critérios de aceitação**

- [ ] Não dá para escolher data final antes da inicial nem horário final igual ou antes do inicial.
- [ ] Depois de criar, a autorização aparece na lista com "Ativa" e o visitante a vê na T04.

**Definição de pronto**

- [ ] Autorização criada pelo app aparece no Swagger com os mesmos valores.

---

### F08 — Administração: lista e cancelamento de autorizações (RF04, RF05)

- **Depende de:** F07; **B09** · **Libera:** F14; cenário 3 do M4 pelo app
- **Prazo:** 17/11 · **Prioridade:** 🔴 · **Telas:** [T23 Lista](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-503), [T25 Detalhe e cancelamento](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-221) ([diálogo](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-254))
- **Objetivo:** consultar autorizações com filtros e cancelar uma delas.

**Contrato** (B09): `GET /authorizations?usuarioId=&accessPointId=&situacao=&dataDe=&dataAte=&page=&pageSize=` (situação **efetiva**, mais recentes primeiro); `GET /authorizations/:id`; `PATCH /authorizations/:id/cancel` com `{ motivo? }` (até 200), **idempotente** (cancelar de novo devolve 200 com o estado atual).

**Elementos**

| Tela | Elementos e regras |
|---|---|
| T23 | Filtros "Pessoa" (busca), "Local" (seleção), "Situação" ("Todas", "Ativas", "Canceladas", "Expiradas", "Esgotadas"), "De" e "Até", "Limpar filtros"; item com pessoa, local, "20/10 a 25/10 · 08:00 às 18:00", "Entradas: 1 de 3" e selo; paginada; vazio "Nenhuma autorização encontrada."; botão "Nova autorização" |
| T25 | Pessoa, local, edifício, período, horário, entradas usadas e restantes, situação; "Criada por {nome} em {data e hora}"; se cancelada, "Cancelada por {nome} em {data e hora}" e o motivo; botão perigo "Cancelar autorização" **só se a situação efetiva for Ativa** |
| Diálogo | "Cancelar esta autorização?"; "A pessoa não poderá mais entrar com ela. Esta ação não pode ser desfeita."; "Motivo (opcional)" até 200; "Voltar" e "Cancelar autorização" |

Depois de cancelar: aviso curto e o selo muda para "Cancelada" na lista e no detalhe sem reabrir (atualize o cache das duas consultas).

**Lista de testes**

- [ ] U model da lista: cada filtro vira o parâmetro certo, sozinho e combinado; "Limpar filtros" zera.
- [ ] U model do detalhe: botão de cancelar só com `situacaoEfetiva = ATIVA`.
- [ ] U model do cancelamento: envia o motivo (ou nada); atualiza lista e detalhe; segundo cancelamento não mostra erro.
- [ ] U schema do motivo: 200 caracteres passam, 201 não.

**Critérios de aceitação**

- [ ] A confirmação sempre aparece antes de cancelar.
- [ ] Depois do cancelamento, a próxima leitura do QR com essa autorização é negada com "Sua autorização foi cancelada. Procure a administração." (cenário 3 do M4).

**Definição de pronto**

- [ ] Testado com a API real.

---
