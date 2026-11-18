# Plano da documentação — etapas G04 a G10

Este plano lista os documentos que faltam para a entrega. Ele usa o mesmo formato das etapas B, F e I.
Leia este arquivo antes de começar uma etapa G. Atualize as caixas de seleção no fim de cada etapa.

Legenda: 📄 = exigência do documento oficial do desafio · 💡 = sugestão do time · 🔴 essencial ·
🟡 importante · 🟢 pode ser cortada.

---

## 1. Origem

O documento oficial (versão de 31/08/2026) exige só uma documentação, na RP07:

1. documentação e desenho da arquitetura;
2. diagramas (casos de uso, componentes etc.);
3. descrição da comunicação entre os elementos do sistema.

As outras etapas deste plano são sugestões do time. Elas dão evidência para requisitos que o avaliador
pode cobrar (RNF11 e o plano de testes).

## 2. O que já existe

Estes documentos já atendem à RP07. Não faça de novo. Use links para eles.

| Exigência | Documento |
|---|---|
| Comunicação entre os elementos | [backend/docs/comunicacao.md](../backend/docs/comunicacao.md) e [backend/openapi.yaml](../backend/openapi.yaml) |
| Diagramas de sequência | [backend/docs/sequencias.md](../backend/docs/sequencias.md) |
| Modelo de dados | [backend/docs/modelo-de-dados.md](../backend/docs/modelo-de-dados.md) (gerado do Prisma) |
| Arquitetura do backend | [backend/docs/arquitetura-backend.md](../backend/docs/arquitetura-backend.md) |
| Roteiro de teste integrado | [testes/roteiro-teste-integrado.md](testes/roteiro-teste-integrado.md) (G02) |

## 3. Fora deste plano

- **Documento do hardware** (lista de materiais, físico × simulado): retirado por decisão do Eduardo em 17/11/2026.
- **Texto de eficiência energética:** é a etapa **I13** do Matheus (`terminal/docs/energia.md`). A G06 só faz um link para ele.
- **Manual do usuário do app:** é a etapa **F15** do Pedro. A G06 só faz um link para ele.

## 4. Sequência e prazos

| Etapa | Nome | Depende de | Libera | Prazo | Prioridade |
|---|---|---|---|---|---|
| G04 | Casos de uso | G03 | G05, G06 | 19/11 | 🔴 📄 |
| G05 | Diagrama de componentes | G04 | G06 | 20/11 | 🔴 📄 |
| G06 | Documento de arquitetura do sistema | G04, G05 | G10 | 21/11 | 🔴 📄 |
| G07 | Estratégia de Git no README | G03 | G10 | 21/11 | 🟡 💡 |
| G08 | Registro de decisões (ADR) | G06 | G10 | 22/11 | 🟢 💡 |
| G09 | Relatório do teste integrado | G02; I12, I14 | G10 | 23/11 | 🔴 💡 |
| G10 | Revisão final da documentação | G04 a G09 | Review 3 (25/11) | 24/11 | 🔴 |

## 5. Regras comuns

### 5.1 Branch, commit e PR

- Uma etapa por branch e por PR: `feature/G04-casos-de-uso`, título `[G04] Casos de uso`.
- Commits no padrão Conventional Commits, com o ID: `docs(G04): ...`.
- O PR vai para a `develop`. Nada vai direto para a `main`.

### 5.2 Diagramas

- Use PlantUML para diagramas UML (casos de uso e componentes). O Mermaid não tem a notação UML desses dois.
- Crie uma pasta para cada etapa em `docs/arquitetura/<nome>/`, por exemplo `casos-de-uso/`.
- Guarde o documento (`.md`), a fonte (`.puml`) e a imagem (`.svg`) lado a lado nessa pasta.
- Gere a imagem com o PlantUML local: `plantuml -tsvg docs/arquitetura/*/*.puml`. Não envie o diagrama para um servidor externo.
- O contrato manda. Use os nomes do `openapi.yaml` e do `03-domain-and-contract.md`: `ADMIN`, `QR`, `AUTORIZADO`, `ABRIR`, `NEGAR`.

### 5.3 Escrita (ASD-STE100, rigidez de 80%)

Siga estas regras em pelo menos 80% das frases. Use a exceção só quando a regra deixa o texto errado ou ambíguo.

- Uma ideia por frase.
- Frase de instrução: até 20 palavras. Frase de descrição: até 25 palavras.
- Parágrafo: até 6 frases.
- Voz ativa. Diga quem faz a ação: "O terminal envia o UID", não "O UID é enviado".
- Instrução no imperativo: "Abra o app", não "Deve-se abrir o app".
- Sem gerúndio para indicar ação: "O terminal lê a tag", não "O terminal fica lendo a tag".
- Um termo para cada coisa. Use sempre "terminal", "ponto de acesso", "autorização", "evento". Não troque por sinônimos.
- Sem palavras vagas: "rápido", "várias", "adequado". Use números: "em até 2 s", "3 tentativas".
- Listas com itens paralelos: todos começam pelo mesmo tipo de palavra.
- Termos técnicos do contrato ficam como estão, em `código`.

### 5.4 Definição de pronto comum

- [ ] O documento está em `docs/` e aparece no [índice](README.md).
- [ ] Os nomes batem com o contrato.
- [ ] O texto segue a seção 5.3. Confira com a lista da G10.
- [ ] Os links abrem no GitHub.
- [ ] Outra pessoa do time revisou o PR.

---

## 6. Etapas

### G04 — Casos de uso (RP07)

- **Depende de:** G03 · **Libera:** G05, G06
- **Prazo:** 19/11 · **Prioridade:** 🔴 📄
- **Objetivo:** mostrar quem usa o sistema e o que cada ator faz. O diagrama antigo divergia do contrato e foi apagado na G03.

**Tarefas**

1. Defina os atores:
   - Administrador;
   - Usuário, com as especializações Condômino e Visitante;
   - Terminal de acesso, como ator de sistema.
2. Defina os casos de uso. Use um ID por caso (UC01 em diante):
   - autenticar;
   - manter usuários;
   - manter locais (edifício e ponto de acesso);
   - manter terminais (com a troca da chave);
   - criar autorização;
   - consultar autorizações;
   - cancelar autorização;
   - vincular tag NFC (pelo UID ou pelo modo de cadastro do terminal);
   - consultar minhas autorizações;
   - consultar histórico (o administrador vê todos; o usuário vê os próprios);
   - acessar por QR Code;
   - acessar por NFC;
   - exibir QR Code;
   - enviar eventos offline.
3. Desenhe o diagrama em `docs/arquitetura/casos-de-uso/casos-de-uso.puml`. Gere o `.svg`.
4. Escreva `docs/arquitetura/casos-de-uso/casos-de-uso.md`. Para cada caso, faça uma ficha com:
   - ator principal;
   - pré-condição;
   - fluxo principal;
   - fluxos alternativos (os motivos de negação da seção 4.4 do contrato);
   - requisitos ligados (RF).
5. Mostre que o administrador também pode acessar por QR Code. Qualquer perfil valida QR.

> Feito em [arquitetura/casos-de-uso/casos-de-uso.md](arquitetura/casos-de-uso/casos-de-uso.md). Entrou o UC15 "Informar posição e estado" para cobrir o RF11.

**Critérios de aceitação**

- [x] Cada RF de RF01 a RF17 aparece em pelo menos um caso de uso.
- [x] Os 13 motivos de negação aparecem nos fluxos alternativos.
- [x] O NFC não inclui a regra dos 100 m (decisão 4 do contrato).
- [x] O diagrama abre no GitHub sem rolagem lateral na tela de um notebook.

**Definição de pronto**

- [ ] Pedro confere os casos do app. Matheus confere os casos do terminal.

---

### G05 — Diagrama de componentes (RP07)

- **Depende de:** G04 · **Libera:** G06
- **Prazo:** 20/11 · **Prioridade:** 🔴 📄
- **Objetivo:** mostrar as partes do sistema e as interfaces entre elas.

**Tarefas**

1. Desenhe os componentes:
   - app mobile (React Native e Expo);
   - API (Node.js, Express e TypeScript), com as camadas da arquitetura limpa;
   - banco PostgreSQL (Neon);
   - terminal de acesso (ESP32), com OLED, RC522, GPS, servo e buzzer;
   - Azure Container Apps e GitHub Container Registry.
2. Mostre cada interface com o protocolo e a autenticação:
   - app → API: HTTPS e JWT;
   - terminal → API: HTTPS e chave do terminal;
   - API → banco: Prisma.
3. Grave a fonte em `docs/arquitetura/componentes/componentes.puml`. Gere o `.svg`.
4. Faça uma tabela com o que cada componente faz e a pasta dele no repositório.

> Feito em [arquitetura/componentes/componentes.md](arquitetura/componentes/componentes.md). O diagrama mostra as interfaces da API como
> duas interfaces UML: API do app e API do terminal. Ele também mostra os barramentos do ESP32 e o caminho do CD.

**Critérios de aceitação**

- [x] Cada interface do diagrama tem uma rota ou um grupo de rotas do `openapi.yaml`.
- [x] O diagrama não mostra MQTT. O projeto usa HTTP com polling.

**Definição de pronto**

- [x] O README raiz usa a imagem nova no lugar do Mermaid simples.

---

### G06 — Documento de arquitetura do sistema (RP07)

- **Depende de:** G04, G05 · **Libera:** G10
- **Prazo:** 21/11 · **Prioridade:** 🔴 📄
- **Objetivo:** juntar, num só documento, as três partes do sistema. Hoje só o backend tem documento de arquitetura.

**Tarefas**

1. Escreva `docs/arquitetura/arquitetura-sistema/arquitetura-sistema.md` com estas seções:
   1. visão geral e problema;
   2. componentes (diagrama da G05);
   3. casos de uso (link para a G04);
   4. fluxo do acesso por QR Code e por NFC (link para `sequencias.md`);
   5. comunicação (link para `comunicacao.md` e para o Swagger);
   6. dados (link para `modelo-de-dados.md`);
   7. segurança, com um resumo e um link para `seguranca.md`;
   8. implantação: CI, CD, Docker e homologação;
   9. confiabilidade: o terminal sem rede;
   10. limitações conhecidas.
2. Resuma cada parte em até 2 parágrafos. Para o detalhe, use um link.
3. Ligue cada seção aos RNF que ela atende.
4. Faça links para `terminal/docs/energia.md` (I13) e para o manual do usuário (F15).

> Feito em [arquitetura/arquitetura-sistema/arquitetura-sistema.md](arquitetura/arquitetura-sistema/arquitetura-sistema.md). O `energia.md`
> (I13) e o manual (F15) ainda não existem: o documento cita os dois sem link. A G10 troca o texto pelo link.

**Critérios de aceitação**

- [ ] Uma pessoa de fora entende o sistema em até 10 minutos de leitura.
- [x] Cada RNF (RNF01 a RNF12) aparece em pelo menos uma seção.
- [x] Nenhuma informação contradiz o contrato.

**Definição de pronto**

- [ ] Pedro e Matheus revisam as seções do app e do terminal.

---

### G07 — Estratégia de Git no README (RNF11)

- **Depende de:** G03 · **Libera:** G10
- **Prazo:** 21/11 · **Prioridade:** 🟡 💡
- **Objetivo:** o RNF11 pede uma estratégia de versionamento definida. Hoje a regra está só nos documentos de IA.

**Tarefas**

1. Crie a seção "Como trabalhamos com Git" no README raiz.
2. Descreva:
   - as branches: `main`, `develop` e `feature/<ID>-descricao`;
   - os IDs das etapas: B (backend), F (app), I (terminal) e G (geral);
   - o padrão dos commits (Conventional Commits com o ID);
   - o padrão dos PRs (`[ID] título`, um revisor);
   - as proteções da `main` e da `develop` (rulesets e CI obrigatório);
   - como a `develop` chega à `main`.
3. Faça um link para o histórico de PRs como evidência.

**Critérios de aceitação**

- [ ] Uma pessoa nova cria a branch e o PR certos só com o README.
- [ ] O texto bate com os rulesets em `.github/rulesets/`.

---

### G08 — Registro de decisões (ADR)

- **Depende de:** G06 · **Libera:** G10
- **Prazo:** 22/11 · **Prioridade:** 🟢 💡
- **Objetivo:** juntar as decisões de arquitetura num só lugar. Hoje elas estão na seção 3 do contrato e no `STATUS.md`.

**Tarefas**

1. Crie `docs/arquitetura/decisoes/decisoes.md`.
2. Para cada decisão, escreva: contexto, decisão, alternativas e consequência. Use até 6 frases.
3. Registre no mínimo:
   - HTTP com polling, e não MQTT;
   - regra dos 100 m como raio máximo;
   - posição do terminal: GPS com reserva no cadastro;
   - QR de uso único com 10 s mais 5 s de tolerância;
   - terminal sem rede nega e envia o lote depois;
   - administração só pelo app, sem painel web;
   - Azure Container Apps em Chile Central e Neon, com custo zero;
   - UID da tag NFC clonável como risco aceito.
4. Faça um link para a seção do contrato de onde cada decisão saiu.

> Feito em [arquitetura/decisoes/decisoes.md](arquitetura/decisoes/decisoes.md). Entraram também o ADR-09 (NFC
> sem comando) e o ADR-10 (um evento por tentativa). O ADR-01 e o ADR-07 citam o `STATUS.md` e o `comunicacao.md`,
> porque o contrato não tem uma seção para essas decisões.

**Critérios de aceitação**

- [x] Cada decisão tem uma origem que dá para conferir.

---

### G09 — Relatório do teste integrado

- **Depende de:** G02; **I12** (fila offline) e **I14** (HTTPS no terminal) · **Libera:** G10
- **Prazo:** 23/11 · **Prioridade:** 🔴 💡
- **Objetivo:** executar o roteiro da G02 e registrar o resultado. O plano de testes precisa do relatório de execução.

**Tarefas**

1. Confira as pré-condições da seção 2 do [roteiro](testes/roteiro-teste-integrado.md).
2. Execute os casos com Pedro e Matheus, na homologação.
3. Preencha a seção 12 do roteiro: ambiente, resumo, defeitos e evidências.
4. Guarde as evidências em `docs/testes/evidencias/<data>/`.
5. Abra um card no Trello para cada defeito, com a etapa responsável.
6. Repita os casos que falharam depois da correção.

**Critérios de aceitação**

- [ ] Todos os casos têm situação: ✅, ❌ ou ⏭ com o motivo.
- [ ] Os casos do QR (IT-20 a IT-31) passam antes da Review 3.
- [ ] Os vídeos do IT-20 e do IT-41 estão nas evidências.

**Definição de pronto**

- [ ] O `plano-de-testes.md` do backend marca M5 e M6 como feitos, com link para o relatório.

---

### G10 — Revisão final da documentação

- **Depende de:** G04 a G09 · **Libera:** Review 3 (25/11) e apresentação final
- **Prazo:** 24/11 · **Prioridade:** 🔴
- **Objetivo:** conferir que a documentação atende à RP07 e que ela é coerente.

**Tarefas**

1. Atualize o [índice](README.md) com todos os documentos novos.
2. Abra cada link do índice no GitHub.
3. Confira os nomes de cada diagrama com o contrato.
4. Confira a escrita com esta lista, em uma amostra de 20 frases de cada documento novo:
   - [ ] frase de instrução com até 20 palavras;
   - [ ] voz ativa;
   - [ ] imperativo nas instruções;
   - [ ] um termo para cada coisa;
   - [ ] sem palavras vagas.

   O documento passa se 16 das 20 frases (80%) seguem a lista.
5. Faça a matriz RP07 × documento no índice.
6. Leve a `develop` para a `main` por PR, com a documentação completa.

**Critérios de aceitação**

- [ ] Os três itens da RP07 têm um documento cada.
- [ ] Nenhum link quebrado.
- [ ] A `main` e a `develop` estão iguais depois do PR.

**Definição de pronto**

- [ ] O time revisou a documentação antes da Review 3.

---

## 7. Checklist final

- [x] G04 Casos de uso
- [x] G05 Diagrama de componentes
- [x] G06 Documento de arquitetura do sistema
- [ ] G07 Estratégia de Git no README
- [x] G08 Registro de decisões
- [ ] G09 Relatório do teste integrado
- [ ] G10 Revisão final
- [ ] I13 `energia.md` (Matheus)
- [ ] F15 Manual do usuário (Pedro)
