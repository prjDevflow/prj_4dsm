# 05 — Etapas B06 a B10: cadastros, autorizações e deploy

Carregue este arquivo quando a etapa atual estiver entre B06 e B10. Leia antes `02-tdd-workflow.md` (laço TDD e DoD comum) e, para contrato e regras, `03-domain-and-contract.md`.

Legenda: **U** = unitário (doubles, sem banco) · **I** = integração (supertest + PostgreSQL de testes).

---

### B06 — Usuários (RF01)

- **Depende de:** B05 · **Libera:** B08, B16; Lucas (F05)
- **Prazo:** Sprint 1, **19/10** · **Prioridade:** 🔴
- **Objetivo:** o administrador cadastra, edita e desativa usuários dos três perfis.

**Use cases** (`src/useCases/Users/`): `CreateUser`, `ListUsers`, `GetUser`, `UpdateUser`. Todas as rotas exigem `authorize('ADMIN')`. Port novo: `IUserRepository` ganha `existsByEmail`, `save`, `list(filtros)`, `countActiveAdmins`.

**Regras**

- Não existe `DELETE`: desativar é `ativo: false`.
- E-mail único e **sempre salvo em minúsculas**; não muda depois de criado (💡 o `PATCH` rejeita o campo `email` com 422, schema `strict`).
- Senha com no mínimo 8 caracteres, gravada só como hash (`IHashProvider`).
- O administrador não desativa a si mesmo nem rebaixa o próprio perfil (409 `AUTO_DESATIVACAO`). O sistema nunca fica sem administrador ativo (409 `ULTIMO_ADMIN`, proteção defensiva).
- Listagem: filtros `perfil`, `ativo`, `q` (parte do nome ou e-mail), paginação, ordenação por nome.
- A resposta nunca contém `senhaHash`. Objeto `usuario`: `{ id, nome, email, perfil, ativo, criadoEm }`.

**Contrato**

| Rota | Corpo (campos) | Sucesso | Erros |
|---|---|---|---|
| `POST /users` | `nome` (3 a 120), `email`, `perfil`, `senha` (mínimo 8) | 201 usuário | 409 `EMAIL_JA_CADASTRADO`; 422 |
| `GET /users` | query `perfil`, `ativo`, `q`, `page`, `pageSize` | 200 lista paginada | 403 |
| `GET /users/:id` | — | 200 usuário | 404 |
| `PATCH /users/:id` | qualquer de `nome`, `perfil`, `ativo`, `senha` | 200 usuário | 409 `ULTIMO_ADMIN` ou `AUTO_DESATIVACAO`; 422; 404 |

**Lista de testes**

- [x] U `CreateUser`: grava e-mail em minúsculas e senha como hash (nunca o texto puro).
- [x] U `CreateUser`: e-mail repetido, inclusive variando maiúsculas, lança 409 `EMAIL_JA_CADASTRADO`.
- [x] U `UpdateUser`: atualiza nome, perfil, ativo e senha (nova senha vira hash).
- [x] U `UpdateUser`: administrador não desativa a si mesmo (`AUTO_DESATIVACAO`) nem rebaixa o próprio perfil.
- [x] U `UpdateUser`: bloqueia quando o resultado deixaria zero administradores ativos (`ULTIMO_ADMIN`).
- [x] U `GetUser`: usuário inexistente lança `NotFoundError`.
- [x] U `ListUsers`: cada filtro isolado e combinado devolve o conjunto certo; `q` busca em nome e e-mail.
- [x] I `POST /users`: perfil fora dos três valores → 422; senha de 7 caracteres → 422.
- [x] I condômino e visitante recebem 403 em **todas** as rotas.
- [x] I nenhuma resposta (criar, listar, obter, atualizar) contém `senhaHash`.
- [x] I desativar um usuário impede o login e invalida o token dele (usa B05).
- [x] I `PATCH` com campo `email` → 422.

**Critérios de aceitação**

- [x] Criar com e-mail repetido (inclusive variando maiúsculas) retorna 409.
- [x] Perfil fora dos três valores retorna 422.
- [x] Senha de 7 caracteres retorna 422.
- [x] Condômino e visitante recebem 403 em todas as rotas.
- [x] Desativar um usuário impede o login e invalida o token dele.
- [x] O admin não consegue desativar a si mesmo (409).
- [x] Nenhuma resposta traz `senhaHash`.

**Definição de pronto**

- [x] Testes de cada critério acima.
- [x] Swagger com exemplos de requisição e das três respostas de erro.

---

### B07 — Locais de acesso e terminais (RF02 e parte do RF11)

- **Depende de:** B05 · **Libera:** B08; B11, B12; **Pedro (I05) ★**; Lucas (F06)
- **Prazo:** Sprint 1, **19/10** · **Prioridade:** 🔴
- **Objetivo:** cadastrar edifícios, pontos de acesso e terminais, e autenticar o terminal por chave.

**Use cases**

- `Locations/`: `CreateBuilding`, `ListBuildings`, `UpdateBuilding`, `CreateAccessPoint`, `ListAccessPoints`, `UpdateAccessPoint`.
- `Terminals/`: `CreateTerminal`, `ListTerminals`, `UpdateTerminal`, `RotateTerminalKey`, `AuthenticateTerminal` (sem Controller; usado pelo middleware `authenticateTerminal`).
- Ports novos: `IBuildingRepository`, `IAccessPointRepository`, `ITerminalRepository`, `ISecureRandom`, e `IAuthorizationRepository.hasActiveNonExpiredForAccessPoint(accessPointId, today)` (a tabela já existe desde B04; o port completo cresce na B08).

**Regras**

- Edifício: `nome`, `endereco`, `latitude`, `longitude`, `ativo`. Ponto de acesso: `buildingId`, `tipo` (`PORTARIA`, `PORTA`, `CATRACA`), `nome`, `identificacao`, coordenadas, `ativo`; filtros `buildingId`, `tipo`, `ativo`.
- Latitude entre -90 e 90, longitude entre -180 e 180. Nada é apagado.
- **Não desativar** ponto de acesso que tenha autorização ativa e não expirada (409 `LOCAL_COM_AUTORIZACOES_ATIVAS`).
- Terminal: um por ponto de acesso (409 `CONFLICT`). `POST /terminals` devolve `{ id, apiKey }` e a `apiKey` **só aparece nessa resposta**; no banco fica o SHA-256. A chave tem 32 bytes aleatórios em base64url.
- `rotate-key` gera chave nova e invalida a antiga na hora.
- `AuthenticateTerminal`: lê `X-Terminal-Id` e `X-Terminal-Key`, compara o hash; chave errada ou ausente → 401; terminal inativo → 403.
- Online: `ultimoContatoEm` há menos de `TERMINAL_ONLINE_WINDOW_S` (30 s). `GET /terminals` indica online ou offline usando o `IClock`.

**Lista de testes**

- [x] U `CreateTerminal`: devolve a `apiKey` uma vez e persiste só o hash (a chave em claro não aparece no repositório).
- [x] U `CreateTerminal`: segundo terminal no mesmo ponto lança 409.
- [x] U `RotateTerminalKey`: a chave antiga deixa de autenticar; a nova autentica.
- [x] U `AuthenticateTerminal`: chave certa passa; chave errada → 401; cabeçalho ausente → 401; terminal inativo → 403.
- [x] U `ListTerminals`: com `FakeClock`, 29 s após o contato é online e 31 s é offline.
- [x] U `UpdateAccessPoint`: desativar com autorização ativa e vigente lança 409 `LOCAL_COM_AUTORIZACOES_ATIVAS`; com autorização expirada ou cancelada permite.
- [x] I coordenadas fora da faixa em edifício e ponto de acesso → 422.
- [x] I só `ADMIN` cadastra e consulta; os outros perfis recebem 403.
- [x] I o terminal do seed (B04) autentica com a chave de desenvolvimento.
- [x] I a `apiKey` não aparece em `GET /terminals` nem em `GET` de um terminal.
- [x] U e I (acréscimo da B07) desativar um **edifício** segue a mesma regra do ponto: 409 `LOCAL_COM_AUTORIZACOES_ATIVAS` se algum ponto dele tem autorização ativa e vigente; senão desativa o edifício e todos os pontos dele numa transação (reativar não reativa os pontos). Ponto novo ou reativado em edifício inativo → 422.

**Critérios de aceitação**

- [x] Só `ADMIN` cadastra e consulta; outros perfis recebem 403.
- [x] Coordenadas fora da faixa → 422.
- [x] Criar um segundo terminal no mesmo ponto → 409.
- [x] A `apiKey` aparece uma única vez e não é recuperável depois.
- [x] Requisição de terminal com chave errada → 401; com terminal inativo → 403.
- [x] Depois de `rotate-key`, a chave antiga deixa de funcionar na hora.
- [x] `GET /terminals` indica corretamente online e offline.

**Definição de pronto**

- [x] O terminal de desenvolvimento do seed (B04) autentica com a chave de dev.
- [x] Testes do middleware `authenticateTerminal` (chave certa, errada, terminal inativo, ausência de cabeçalho).
- [ ] Pedro avisado da chave de dev e de como testar com `curl` (★). (o roteiro está em `docs/ambiente-dev.md`; falta avisar)

---

### B08 — Criar autorização (RF03)

- **Depende de:** B06, B07 · **Libera:** B09, B15; Lucas (F07)
- **Prazo:** Sprint 1 (iniciar) → Sprint 2 semana 1 (fechar) · **Prioridade:** 🔴
- **Objetivo:** o administrador cria uma autorização com os oito campos exigidos 📄.

**Use cases** (`src/useCases/Authorizations/`): `CreateAuthorization`, `GetAuthorization` (reutilizado na B09). Entidade `Authorization` com fábrica `Authorization.create(...)`. Port `IAuthorizationRepository` ganha `save`, `findById`, `findViewById` (read model com `usuario`, `local` e `edificio` resolvidos). Providers: `IClock`, `IIdGenerator`.

**Regras de validação**

- Nota (B07): ponto de acesso inativo já cobre o edifício inativo, porque desativar o edifício desativa os pontos dele; a B08 só olha o ponto. **Concorrência (protocolo de travas da B07):** a B08 grava a autorização dentro de `ILocationUnitOfWork` (ou outra unidade de trabalho), trava o ponto com `FOR SHARE` (`findByIdForShare` no `IAccessPointRepository`, a criar) e só então confere `ativo`; sem isso, uma autorização criada no instante da desativação do local pode ficar num ponto inativo. Teste de integração com PostgreSQL real, como em `locationConcurrency.test.ts`.
- Usuário existe (senão 404) e está ativo (senão 422 com `details` no campo `usuarioId`). Ponto de acesso existe (404) e está ativo (422).
- `dataFim` maior ou igual a `dataInicio`; `dataFim` **não** pode estar no passado (hoje no fuso de São Paulo); `horaFim` maior que `horaInicio` (sem virada de meia-noite); `usosPermitidos` inteiro de 1 a 1000.
- Grava `criadoPorId` (do token), `criadoEm` (relógio), `situacao = ATIVA`, `usosRealizados = 0`.
- A resposta traz os campos calculados `usosRestantes` e `situacaoEfetiva`.

**Contrato**

Requisição:

```json
{ "usuarioId": "uuid", "accessPointId": "uuid",
  "dataInicio": "2026-10-20", "dataFim": "2026-10-25",
  "horaInicio": "08:00", "horaFim": "18:00", "usosPermitidos": 3 }
```

Resposta 201 (reutilizada em B09 e consumida por F07, F08 e F09):

```json
{ "id": "uuid",
  "usuario": { "id": "uuid", "nome": "Maria Souza", "perfil": "VISITANTE" },
  "local": { "id": "uuid", "nome": "Catraca Social", "tipo": "CATRACA",
             "edificio": { "id": "uuid", "nome": "Edifício Central" } },
  "dataInicio": "2026-10-20", "dataFim": "2026-10-25",
  "horaInicio": "08:00", "horaFim": "18:00",
  "usosPermitidos": 3, "usosRealizados": 0, "usosRestantes": 3,
  "situacao": "ATIVA", "situacaoEfetiva": "ATIVA",
  "criadoPor": { "id": "uuid", "nome": "Admin" }, "criadoEm": "2026-10-19T12:00:00Z",
  "canceladoPor": null, "canceladoEm": null, "motivoCancelamento": null }
```

**Lista de testes**

- [ ] U `CreateAuthorization`: grava os oito campos e devolve `situacao: ATIVA`, `usosRealizados: 0`.
- [ ] U `CreateAuthorization`: `criadoPorId` vem do administrador e `criadoEm` do relógio injetado.
- [ ] U `CreateAuthorization`: usuário inexistente → `NotFoundError`; local inexistente → `NotFoundError`.
- [ ] U `CreateAuthorization`: usuário inativo e local inativo → erro de validação com mensagem por campo.
- [ ] U `CreateAuthorization`: `dataFim` anterior a `dataInicio` rejeita; igual aceita.
- [ ] U `CreateAuthorization`: `dataFim` no passado em São Paulo rejeita; hoje aceita (limite com `FakeClock` perto da meia-noite UTC).
- [ ] U `CreateAuthorization`: `horaFim` igual a `horaInicio` rejeita; `horaFim` maior aceita.
- [ ] I `POST /authorizations`: `usosPermitidos` 0 e 1001 → 422 com mensagem por campo.
- [ ] I só `ADMIN` cria (403 para os demais).
- [ ] I a resposta traz `usosRestantes`, `situacaoEfetiva`, `criadoPor` e `criadoEm`.
- [ ] I `GET /authorizations/:id` devolve o mesmo objeto.

**Critérios de aceitação**

- [ ] Os oito campos obrigatórios são gravados e devolvidos.
- [ ] Cada validação acima tem um teste que falha com 422 e mensagem por campo.
- [ ] Usuário ou local inexistente → 404; inativo → 422 com mensagem clara.
- [ ] Só `ADMIN` cria.
- [ ] `criadoPor` e `criadoEm` ficam registrados.

**Definição de pronto**

- [ ] Testes de datas e horas nos limites (mesmo dia, `horaFim == horaInicio` rejeitado).
- [ ] Swagger com o objeto completo e todos os erros.

---

### B09 — Consultar, cancelar e "minhas autorizações" (RF04, RF05, RF08)

- **Depende de:** B08 · **Libera:** Lucas (F08, F09)
- **Prazo:** Sprint 2, semana 1 · **Prioridade:** 🔴
- **Objetivo:** o administrador consulta e cancela autorizações; o usuário vê apenas as próprias.

**Use cases** (`src/useCases/Authorizations/`): `ListAuthorizations`, `CancelAuthorization`, `ListMyAuthorizations`; `GetAuthorization` (B08) ganha a regra de visibilidade.

**Regras**

- `GET /authorizations` (admin): filtros `usuarioId`, `accessPointId`, `situacao` (valor **efetivo**), `dataDe`, `dataAte`, paginação, mais recentes primeiro. O filtro por situação efetiva é feito **na consulta**, sem carregar tudo na memória:
	- `CANCELADA`: `situacao = CANCELADA`;
	- `EXPIRADA`: `situacao = ATIVA` e `dataFim` anterior a hoje (São Paulo);
	- `ESGOTADA`: `situacao = ATIVA`, `dataFim` maior ou igual a hoje e `usosRealizados` maior ou igual a `usosPermitidos`;
	- `ATIVA`: `situacao = ATIVA`, `dataFim` maior ou igual a hoje e `usosRealizados` menor que `usosPermitidos`.
- `PATCH /authorizations/:id/cancel` (admin): corpo opcional `{ "motivo": "até 200" }`; grava `situacao = CANCELADA`, `canceladoPorId`, `canceladoEm`. **Idempotente**: cancelar de novo devolve 200 com o estado atual e não altera `canceladoEm`.
- `GET /me/authorizations` (qualquer perfil): só as do usuário do token, filtro `situacao` opcional, ordenadas por `dataFim`.
- `GET /authorizations/:id` por não-admin só funciona para as próprias; para as de outros devolve **404** (não revela que existe).

**Lista de testes**

- [ ] U `CancelAuthorization`: grava `CANCELADA`, `canceladoPorId`, `canceladoEm` e `motivoCancelamento`.
- [ ] U `CancelAuthorization`: cancelar duas vezes devolve o estado atual e mantém o `canceladoEm` original.
- [ ] U `CancelAuthorization`: autorização inexistente → `NotFoundError`.
- [ ] U `GetAuthorization`: não-admin lendo a de outro recebe `NotFoundError`; lendo a própria funciona.
- [ ] U `ListMyAuthorizations`: usa sempre o id do token, ignora `usuarioId` vindo na query.
- [ ] I `GET /authorizations`: um teste por filtro (`usuarioId`, `accessPointId`, `situacao`, `dataDe`, `dataAte`) e combinações.
- [ ] I `situacao=EXPIRADA` traz as de `dataFim` passada; `ESGOTADA` as que gastaram todos os usos; seed com as quatro situações para provar a precedência.
- [ ] I não-admin recebe 403 em `GET /authorizations` e no cancelamento.
- [ ] I teste de vazamento: usuário A lê a autorização do usuário B por id → 404; `/me/authorizations` nunca devolve a de outra pessoa.
- [ ] I depois do cancelamento, a validação seguinte é negada com `AUTORIZACAO_CANCELADA` (escrever quando a B15 existir).

**Critérios de aceitação**

- [ ] Cada filtro isolado e combinados retornam o conjunto correto (um teste por filtro).
- [ ] O filtro `EXPIRADA` traz as de `dataFim` passada; `ESGOTADA` as que gastaram todos os usos.
- [ ] Depois do cancelamento, a tentativa de acesso seguinte é negada com `AUTORIZACAO_CANCELADA` (teste de integração com a B15, quando existir).
- [ ] Cancelar duas vezes não gera erro nem altera `canceladoEm`.
- [ ] `/me/authorizations` nunca devolve autorização de outra pessoa.
- [ ] Não-admin recebe 403 em `GET /authorizations` e no cancelamento.

**Definição de pronto**

- [ ] Teste de vazamento: usuário A tenta ler a autorização do usuário B por id → 404.
- [ ] Swagger atualizado; Lucas avisado (★).

---

### B10 — Deploy em nuvem e entrega contínua (RNF09, RP11)

- **Depende de:** B03, B05 · **Libera:** Lucas e Pedro (URL de homologação com HTTPS); I14
- **Prazo:** Sprint 2, semana 1 · **Prioridade:** 🔴
- **Objetivo:** cada merge na `develop` publica o backend em homologação automaticamente, depois do CI verde.

**Tarefas (infraestrutura; não há use case)**

- Escolher o serviço de hospedagem de containers (**conferir planos gratuitos e limites vigentes**). ⚠️ Alguns planos gratuitos suspendem o serviço sem uso e demoram a acordar, o que prejudica o terminal. Teste isso antes de decidir.
- `cd.yml`: roda só se o CI passou → build da imagem Docker → publica no registry → deploy → `prisma migrate deploy` → chama `/health` e falha se não estiver `ok`.
- Variáveis e segredos no serviço e nos *secrets* do repositório (`DATABASE_URL`, `JWT_SECRET`, ...).
- HTTPS pelo certificado do serviço; informar o Pedro sobre a cadeia que o ESP32 precisa.
- Documentar rollback (voltar para a imagem anterior). Publicar a URL em `docs/ambiente-dev.md`.

**Lista de verificação**

- [ ] Merge na `develop` com CI verde publica sozinho.
- [ ] Um commit com CI vermelho **não** publica (provar com um PR de teste).
- [ ] Pós-deploy: `/health` responde `ok` e `db: up` por HTTPS; a falha desse passo derruba o pipeline.
- [ ] Migrações aplicadas automaticamente no deploy.
- [ ] Swagger acessível na homologação.

**Critérios de aceitação**

- [ ] Merge na `develop` com CI verde publica sozinho, sem passo manual.
- [ ] CI vermelho **não** publica.
- [ ] A URL de homologação responde `/health` com `ok` e `db: up` via HTTPS.
- [ ] Migrações são aplicadas automaticamente no deploy.
- [ ] O Swagger fica acessível na homologação.

**Definição de pronto**

- [ ] Demonstração: commit pequeno → pipeline → versão nova no ar.
- [ ] Lucas e Pedro testaram com a URL real.
