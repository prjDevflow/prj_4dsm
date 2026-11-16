# Relatório de usabilidade e acessibilidade do app (F14, RNF04)

**Autor:** Pedro (mobile). **Data:** 14/11/2026. **Versão do app:** 0.1.0, branch `feature/F14-accessibility`.
**Situação:** a auditoria técnica e as correções estão feitas. O teste com pessoas de 60 anos ou mais e a
passada com leitor de tela num celular real **ainda faltam**, e os resultados entram na seção 3.2.

## 1. Objetivo

Mostrar, com evidência, que o app é simples e acessível, principalmente para pessoas idosas. Os critérios
são do card da F14:

- nenhum texto cortado com a fonte do sistema em 200%;
- todo elemento interativo anunciado com nome e função;
- três tarefas concluídas por pessoas de 60 anos ou mais;
- os cinco problemas mais graves corrigidos;
- no máximo 3 toques do app aberto até o resultado.

## 2. Método

| Verificação | Como foi feita | Onde está |
| --- | --- | --- |
| Nome e função para o leitor de tela | Teste automático que abre as 25 telas pelas rotas reais e lê a árvore como um leitor de tela: tudo que reage ao toque precisa de função e nome; todo campo, de nome; nenhum nome pode ser código (`qr_code_scanner`). O próprio auditor tem um teste que prova que ele acha esses erros | `mobile/test/a11y.audit.spec.tsx` |
| Fonte em 200% e área de toque | Emulador Android 14 (1080 × 2400, 420 dpi) com `font_scale` 2.0, contra a API real de `develop`. Foram abertas e roladas 30 telas, com print em cada posição: todas as do administrador, as da pessoa, o leitor e os resultados autorizado e negado (âmbar). Em cada tela, um script mediu a área de toque de cada elemento focável na tela de verdade (mínimo de 48 × 48 dp) e conferiu se ele tem nome | Prints anexados ao PR |
| Contraste | 30 pares de texto (mínimo de 4,5:1) e 7 partes que não são texto (mínimo de 3:1), calculados pela fórmula do WCAG a partir das cores do tema | `mobile/src/theme/theme.spec.ts` |
| Ordem de foco | Ordem da árvore de acessibilidade do emulador no fluxo principal (login, início, leitor e resultado) | Seção 3.1 |
| Cor como única pista | Revisão das telas: selos, resultado e histórico sempre trazem texto e ícone junto da cor | Seção 3.1 |
| Tempo para ler mensagens | Busca de todo `setTimeout` que esconde uma mensagem | Seção 3.1 |
| Toques do fluxo mais usado | Contados no emulador | Seção 3.1 |
| Leitor de tela real | O TalkBack foi ligado no emulador, mas os gestos que o `adb` injeta não movem o foco de forma confiável. A passada fica para um celular real (seção 3.2) | — |
| Pessoas de 60 anos ou mais | Roteiro e ficha prontos para 2 ou 3 pessoas | [roteiro-teste-com-pessoas.md](roteiro-teste-com-pessoas.md) |

## 3. Resultados

### 3.1 Auditoria técnica

- **Leitor de tela:** nas 25 telas auditadas, nenhum elemento ficou sem nome ou sem função. No emulador, nenhum elemento focável ficou sem nome. A ordem lida segue a da tela, de cima para baixo:
  - **Login:** E-mail (campo) → Senha (campo) → Mostrar senha (botão) → Entrar (botão).
  - **Início:** Minha conta → Abrir catraca → Minhas autorizações, 1 ativa → Meu histórico → Sair.
  - **Resultado:** "Concluir", ou "Ler outro QR Code" → "Voltar ao início". O resultado é anunciado como alerta assim que chega (F11).
- **Área de toque:** todos os elementos inteiros na tela têm pelo menos 48 × 48 dp. Os poucos casos abaixo disso eram elementos cortados pela borda da rolagem e, inteiros, passam.
- **Contraste:** os 37 pares passam. O menor texto fica em 5,6:1 (branco no verde do "Acesso autorizado").
- **Cor:** a cor nunca aparece sozinha. Os selos ("Ativa", "Offline") têm texto, o histórico traz ícone e motivo escrito, e o resultado tem título, ícone e cor.
- **Tempo para ler:**
  - O resultado não some sozinho.
  - O aviso "Este não é o QR Code da catraca" fica na tela enquanto o QR errado está na frente da câmera, e mais 3 s.
  - Só as confirmações curtas do administrador ("Alterações salvas.") somem em 3 s, e o leitor de tela as anuncia.
- **Toques:** com o app já logado, é **1 toque**: "Abrir catraca" abre o leitor, o QR é lido sem toque e o resultado aparece sozinho. Na primeira vez, a permissão da câmera soma mais 1. A meta era de no máximo 3.

**Os 5 problemas mais graves, já corrigidos e conferidos no emulador em 200%:**

| # | Problema (onde) | Gravidade | Correção |
| --- | --- | --- | --- |
| 1 | **Leitor (T07):** com a fonte grande, a moldura do QR cobre a instrução "Aponte a câmera…". É o fluxo mais usado | Alta | A moldura encolhe quando falta espaço (de 240 até 96) |
| 2 | **Opções lado a lado (T19, "Tipo"):** as palavras quebram no meio: "Portari / a", "Catra / ca" | Alta | Com fonte grande, as opções ficam uma embaixo da outra |
| 3 | **Campos de texto (T21 e outros):** um valor longo mostra só o fim ("rminal de Desenvolvimento") | Média | O campo quebra a linha e cresce; o Enter continua passando para o próximo campo. A senha fica em uma linha |
| 4 | **Filtros (T15, T23, T26):** com fonte grande, filtros ficam fora da tela ("Cancel…", "Resulta…"), e quem não sabe rolar de lado não os acha | Média | Com fonte grande, os filtros quebram a linha (componente `ChipRow`) |
| 5 | **Busca de usuários (T15):** o texto de exemplo aparece cortado ("Buscar por nome ou e-…") | Baixa | O texto de exemplo virou "Nome ou e-mail", e o leitor de tela continua ouvindo "Buscar por nome ou e-mail" |

Cada correção tem teste em `mobile/src/components/ui/*.spec.tsx`, em `scanner.view.spec.tsx` e em `usersList.view.spec.tsx`.

**Problemas registrados, sem correção nesta etapa:**

| Problema | Gravidade | Sugestão |
| --- | --- | --- |
| As confirmações do administrador somem em 3 s | Baixa | Passar para 5 s se o teste com pessoas mostrar que não dá tempo de ler |
| No login em 200%, com o teclado aberto, "Entrar" fica embaixo do teclado | Baixa | A tecla "Ir" do teclado já entra; ver no teste com pessoas se alguém se perde |
| No histórico em 200%, os filtros ocupam várias linhas antes da lista | Baixa | Eles rolam junto com a lista; avaliar com o grupo |
| Em desenvolvimento, o botão "Tools" do Expo Go e o painel "Simular posição" cobrem partes da tela | — | Só existem no Expo Go; não vão para o app instalado |

### 3.2 Teste com pessoas e leitor de tela no celular (pendente)

Preencher depois das sessões com a ficha do [roteiro](roteiro-teste-com-pessoas.md):

| Pessoa | Idade | Tarefa 1: entrar | Tarefa 2: ver autorização | Tarefa 3: liberar a catraca | Problemas e falas |
| --- | --- | --- | --- | --- | --- |
| P1 | | | | | |
| P2 | | | | | |
| P3 | | | | | |

Na passada com leitor de tela, vale o mesmo fluxo: login → "Abrir catraca" → resultado, com o
**VoiceOver** (iPhone do Pedro) e o **TalkBack** (Android de alguém do grupo). Para cada tela, anote se cada
item foi lido com nome e função, e se a ordem fez sentido.

## 4. Conclusão

| Critério | Situação |
| --- | --- |
| Nenhum texto cortado com a fonte em 200% | Cumprido nas 30 telas vistas, depois das correções. Ficaram de fora desta passada: a abertura, as telas de permissão da câmera e da localização, o resultado vermelho e a chave do terminal ("Validando" foi visto em 200% na F11) |
| Nome e função para todo elemento interativo | Cumprido no teste automático (25 telas) e na árvore do emulador; falta a passada num celular real |
| As pessoas concluem as três tarefas | Pendente |
| Os cinco problemas mais graves corrigidos | Cumprido; reavaliar a lista depois do teste com pessoas |
| No máximo 3 toques no fluxo mais usado | Cumprido: 1 toque (2 na primeira vez) |
