# 07 — Etapas F12 a F15: histórico, tags NFC e fechamento

Carregue este arquivo quando a etapa atual estiver entre F12 e F15.

Legenda: 📄 exigência do documento oficial do desafio · 💡 decisão ou sugestão do time (pode mudar) · ★ entrega que destrava outra pessoa · ❓ pergunta em aberto (lista no [STATUS.md](STATUS.md)) · 🔴 essencial · 🟡 importante · 🟢 pode ser cortada se faltar tempo.

---

### F13 — Administração: tags NFC (apoio ao RF10 e RF14)

- **Depende de:** F05; **B16** · **Libera:** F14; Matheus (I10, I11 usam as tags cadastradas) ★
- **Prazo:** 18/11 · **Prioridade:** 🔴 · **Telas:** [T28 Lista](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-433), [T29 Formulário](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-498), [T30 Vincular no terminal](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-530) (🟢 extra)
- **Objetivo:** vincular tags NFC a pessoas, para o terminal reconhecê-las. **O app não lê NFC.**

**Contrato** (de `07-steps-B16-B20.md`, B16): `POST /nfc-tags` `{ usuarioId, uid, descricao? }` (o servidor normaliza o UID: tira `:`, `-` e espaços, maiúsculas, hexadecimal de 8 a 20); `GET /nfc-tags?usuarioId=&ativa=`; `PATCH /nfc-tags/:id` (ativar ou desativar). UID repetido → 409 `TAG_JA_CADASTRADA`; UID inválido → 422. 🟢 `POST /terminals/:id/enroll-mode` `{ usuarioId }` abre 60 s para a próxima tag lida naquele terminal ser vinculada.

**Elementos**

| Tela | Elementos e regras |
|---|---|
| T28 | "Tags NFC"; busca por pessoa; item com pessoa, UID parcial, descrição e selo "Ativa"/"Inativa"; "Vincular tag" |
| T29 | "Pessoa" (seleção com busca, obrigatório); "Código da tag (UID)" (aceita A–F, números, `:`, `-` e espaço; vira maiúsculo; ajuda "Exemplo: 04A1B2C3D4"); "Descrição (opcional)"; "Salvar" e "Cancelar". No detalhe, interruptor "Tag ativa" com confirmação ao desativar |
| T30 🟢 | "Ler tag no terminal": escolhe o terminal, "Aproxime a tag do terminal…" com contagem de 60 s; quando a tag aparecer vinculada, "Tag vinculada a {nome}." (❓ 19: como o app fica sabendo) |

Mensagens: UID inválido → "Código inválido. Use de 8 a 20 letras e números."; 409 → "Esta tag já está vinculada a alguém." (no campo).

**Lista de testes**

- [ ] U `normalizeUid` (mesma regra do backend): `04:a1:b2:c3` → `04A1B2C3`; hífens e espaços; 7 e 21 caracteres e letra fora de A–F recusados; 8 e 20 passam.
- [ ] U model do formulário: envia o UID já normalizado; 409 vira erro no campo.
- [ ] U model do detalhe: desativar pede confirmação e envia `PATCH`.
- [ ] 🟢 U model da T30: contagem de 60 s e mensagem de tempo esgotado.

**Critérios de aceitação**

- [ ] `04:a1:b2:c3` é aceito e salvo como `04A1B2C3`.
- [ ] Desativar a tag exige confirmação e vale na hora no terminal (com a B17).

**Definição de pronto**

- [ ] Ensaiado com o Matheus: tag cadastrada pelo app é reconhecida pelo terminal.

---

### F12 — Histórico de acessos (RF06)

- **Depende de:** F04; **B18** · **Libera:** F14; marco M6
- **Prazo:** 20/11 · **Prioridade:** 🟡 · **Telas:** [T26 Histórico](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-301), [T27 Detalhe da tentativa](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-402), [T12 Meu histórico](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-235) (🟢 pode cortar)
- **Objetivo:** o administrador consulta as tentativas, aprovadas e negadas; a pessoa vê as próprias.

**Contrato** (de `07-steps-B16-B20.md`, B18): `GET /access-events?usuarioId=&accessPointId=&terminalId=&metodo=&resultado=&motivo=&de=&ate=&page=&pageSize=` (admin, do mais recente para o mais antigo, com usuário, local e edifício já resolvidos; `usuario: null` quando não identificado); `GET /me/access-events` (só os próprios).

**Elementos**

| Tela | Elementos e regras |
|---|---|
| T26 | Filtros "Período" (padrão últimos 7 dias), "Pessoa", "Local", "Método" (Todos, QR Code, NFC), "Resultado" (Todos, Autorizado, Negado), "Motivo" (lista em texto amigável); "Limpar filtros"; item com data e hora (`dd/MM HH:mm:ss`), pessoa ou "Não identificado", local, método (ícone + texto), selo de resultado e o motivo em texto amigável quando negado; paginada; vazio "Nenhuma tentativa no período." |
| T27 | Todos os campos, incluindo terminal, distância (QR) e autorização usada |
| T12 | Lista simples das próprias tentativas, sem filtros avançados |

Os motivos de NFC e do terminal (`TAG_DESCONHECIDA` "Tag não reconhecida.", `TAG_INATIVA` "Tag desativada.", `TERMINAL_OFFLINE` "Terminal sem conexão.") entram no `denialReasons` só para o histórico.

**Lista de testes**

- [ ] U model: cada filtro vira o parâmetro certo; o período padrão são os últimos 7 dias em São Paulo (relógio controlado).
- [ ] U tela: evento sem usuário mostra "Não identificado"; negado mostra o motivo em texto, nunca o código.
- [ ] U formatter `dd/MM HH:mm:ss` em São Paulo.

**Critérios de aceitação**

- [ ] Filtros isolados e combinados trazem o conjunto esperado.
- [ ] Uma tentativa feita no terminal aparece no histórico em até 5 s (puxar para atualizar).

**Definição de pronto**

- [ ] Testado com eventos reais do ensaio do M4.

---

### F14 — Acessibilidade e usabilidade (RNF04)

- **Depende de:** F11, F12, F13 · **Libera:** F15
- **Prazo:** 22/11 · **Prioridade:** 🟡 · **Telas:** todas
- **Objetivo:** provar, com evidência, que o app é simples e acessível, principalmente para pessoas idosas.

**O que fazer**

1. **Auditoria de todas as telas:** fonte do sistema no máximo (o design pede 200%), contraste (o `tokens.md` já tem as razões calculadas), toque mínimo 48 × 48, rótulos de leitor de tela, ordem de foco, cor nunca sozinha, nenhuma mensagem importante sumindo rápido.
2. **Leitor de tela** (TalkBack; VoiceOver se houver iPhone) nos fluxos de login, abrir catraca e resultado.
3. **Teste com 2 ou 3 pessoas de 60 anos ou mais**, junto com o lote 4 do Rafael (18/11), com uma rodada ao ar livre por causa do tema escuro. Roteiro: "Entre no aplicativo", "Veja se você tem autorização para entrar", "Libere a catraca". Anote tempo, erros, hesitações e frases.
4. Corrija os **5 problemas mais graves** e registre os outros.
5. Confirme que o fluxo mais usado (app já logado → "Abrir catraca" → ler o QR → resultado) tem **no máximo 3 toques**.

**Critérios de aceitação**

- [ ] Nenhuma tela corta texto com a fonte no máximo.
- [ ] Todos os elementos interativos são anunciados com nome e função.
- [ ] As pessoas do teste concluem as três tarefas; os problemas viram lista priorizada.
- [ ] Os cinco problemas mais graves estão corrigidos e conferidos.

**Definição de pronto**

- [ ] Relatório de usabilidade (1 a 2 páginas: método, resultados, correções) em `docs/app-mobile/`.

---

### F15 — Robustez, build e manual do usuário

- **Depende de:** F14; B10 (URL de homologação com HTTPS) · **Libera:** entrega final
- **Prazo:** 24/11 · **Prioridade:** 🟡 · **Telas:** T31 e acabamento de todas
- **Objetivo:** app estável, instalável e documentado para a Review 3 e a apresentação final.

**O que fazer**

1. **Erros e rede (📄 RNF03):** tela de erro global (*error boundary*) com "Tentar novamente"; faixa "Sem internet"; consultas (listas) podem repetir sozinhas, **a validação de acesso nunca**.
2. **Acabamento:** nome, ícone e splash definitivos (❓ 1).
3. **Build instalável:** APK de teste pelo EAS Build (`eas build -p android --profile preview`, conta gratuita do Expo), apontando para a URL de homologação. Instruções de instalação no README.
4. **Testes:** revise a cobertura de login, leitor, resultado e formulários.
5. **Manual do usuário** (1 a 2 páginas com prints): "Como entrar", "Como liberar a catraca com o QR Code", "O que fazer se o acesso for negado" (com as mensagens do `03-contract-for-the-app.md`, seção 2), "Como ver minhas autorizações", "Como sair".
6. Seção **"App móvel"** da documentação técnica (📄 RP07): arquitetura (o `01-architecture.md`, resumido), mapa de telas e navegação, comunicação com a API.

**Critérios de aceitação**

- [ ] O APK funciona num celular que nunca rodou o projeto.
- [ ] Derrubar a internet no meio de uma tela mostra a faixa e permite tentar de novo, sem fechar o app.
- [ ] Nenhuma tela mostra texto técnico (códigos, stack trace).
- [ ] O manual permite a uma pessoa nova usar o app sem ajuda.

**Definição de pronto**

- [ ] APK e manual anexados à release (ou ao repositório).
- [ ] Documentação do app revisada pelo Eduardo.

---
