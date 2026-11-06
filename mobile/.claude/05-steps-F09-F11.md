# 05 — Etapas F09 a F11: o fluxo da pessoa (leitor, validação e minhas autorizações)

Carregue este arquivo quando a etapa atual for F09, F10 ou F11. Elas são o que a Review 2 (11/11) cobra no marco M4 (roteiro no `STATUS.md`). Contrato e códigos de negação: `03-contract-for-the-app.md`.

Legenda: 📄 exigência do documento oficial do desafio · 💡 decisão ou sugestão do time (pode mudar) · ★ entrega que destrava outra pessoa · ❓ pergunta em aberto (lista no [STATUS.md](STATUS.md)) · 🔴 essencial · 🟡 importante · 🟢 pode ser cortada se faltar tempo.

---

### F10 — Leitor de QR Code (RF09)

- **Depende de:** F04; formato do QR (`00-onboarding.md`, seção 2.3) · **Libera:** F11; marco M3 com o Matheus
- **Prazo:** 05/11 · **Prioridade:** 🔴 · **Telas:** [T06 Permissão da câmera](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-106), [T07 Leitor](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-120)
- **Objetivo:** abrir a câmera, ler o QR Code da catraca e entregar o texto lido para a validação (F11).

**O que fazer**

1. `src/lib/qr.ts`: `isSystemQr(text)` com `^ACS1:[A-Za-z0-9_-]{22}$`. É a única regra de formato no app.
2. **T06:** antes do pedido do sistema, "Precisamos da câmera para ler o QR Code da catraca." com "Permitir câmera" e "Agora não". Se negada: "Sem acesso à câmera, não é possível ler o QR Code." e "Abrir configurações" (`Linking.openSettings()`). Use `useCameraPermissions` do `expo-camera`.
3. **T07:** `CameraView` do `expo-camera` em tela cheia (fundo `#0D0F14`), `barcodeScannerSettings={{ barcodeTypes: ["qr"] }}`, moldura central, instrução "Aponte a câmera para o QR Code da catraca.", botão "Voltar" e lanterna ("Ligar lanterna"/"Desligar lanterna", prop `enableTorch`).
4. Ao ler: se **não** for QR do sistema, aviso "Este não é o QR Code da catraca." por 3 s e a leitura continua. Se for: vibração curta (`expo-haptics`), **trava a leitura** (um `ref` que ignora as próximas leituras) e navega para a validação com o texto lido.
5. 💡 Ganhe tempo: ao abrir o leitor, já peça a permissão de localização (T08, se ainda não houver) e comece a pegar a posição (F11). Quando o QR for lido, a posição já está "quente".
6. Sem câmera (emulador) ou em `__DEV__`: campo para colar o texto `ACS1:...` e testar sem câmera.
7. **QR para testar antes do terminal:** gere um QR com um texto `ACS1:` + 22 caracteres válidos (por exemplo `ACS1:q3F8k2Zr1pLw9XbTn0YhVA`) em qualquer gerador de QR e mostre na tela do computador. Quando a B12 sair, o Eduardo terá um QR real de teste (`npm run dev:qr` no backend) e, depois, o terminal do Matheus mostra o QR de verdade.

**Lista de testes**

- [ ] U `isSystemQr`: aceita o exemplo do contrato; recusa link, texto vazio, `ACS2:`, 21 e 23 caracteres, caractere fora do base64url.
- [ ] U model do leitor: QR de outro tipo mostra o aviso e não navega.
- [ ] U model do leitor: QR válido navega uma vez só, mesmo com três leituras seguidas da mesma imagem.
- [ ] U permissão: negada mostra o texto e o botão "Abrir configurações"; concedida mostra a câmera.

**Critérios de aceitação**

- [ ] Com permissão, a câmera abre em até 2 s e lê o QR mostrado na tela do computador (e, depois, no terminal).
- [ ] QR de outro tipo não abre a validação; mostra o aviso e continua lendo.
- [ ] Negar a permissão mostra a explicação e o caminho para as configurações, sem travar o app.
- [ ] O mesmo QR não dispara duas validações.
- [ ] Leitura a 20–40 cm de uma tela pequena (o OLED do terminal), com luz normal.

**Definição de pronto**

- [ ] Testado em pelo menos 2 celulares (o seu e o de outra pessoa do grupo).
- [ ] Vídeo curto da leitura no PR.

---

### F11 — Validação do acesso e resultado (RF13, RF15, RF16)

- **Depende de:** F10; **B15** (falso até sair) · **Libera:** F14; marco M4 (Review 2) ★
- **Prazo:** 07/11 (com o falso); integração real assim que a B15 sair · **Prioridade:** 🔴 (é o fluxo que o desafio avalia)
- **Telas:** [T08 Permissão de localização](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-143), [T09 Validando](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-157), [T10 Autorizado](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-172), [T11 Negado âmbar](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-193) e [vermelho](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-214)
- **Objetivo:** enviar o QR lido e a posição do celular e mostrar, sem dúvida possível, se a pessoa pode passar.

**Contrato** (de `06-steps-B11-B15.md`, B15; ❓ 5: ainda não está no `openapi.yaml`)

```json
// POST /access/qr/validate
{ "payload": "ACS1:q3F8k2Zr1pLw9XbTn0YhVA", "latitude": -23.30512, "longitude": -45.96551, "precisaoMetros": 12.5 }

// 200 autorizado
{ "resultado": "AUTORIZADO", "mensagem": "Acesso autorizado. Pode passar.",
  "local": { "nome": "Catraca Social" }, "usosRestantes": 2, "distanciaM": 14, "ocorridoEm": "2026-10-20T14:32:07Z" }

// 403 negado (código = motivo do `03-contract-for-the-app.md`, seção 2)
{ "error": { "code": "DISTANTE_DO_TERMINAL", "message": "Você está longe da catraca. Aproxime-se e tente de novo." } }
```

Outros: 401 (sessão), 422 `VALIDATION_ERROR` (payload fora do formato; não deveria acontecer, porque o leitor já filtra), 429 `RATE_LIMITED` (10 validações por minuto).

**O que fazer**

1. `IValidateQrService` + `ValidateQrService` (devolve o 200) + `FakeValidateQrService` (escolhe a resposta: autorizado ou um dos 10 motivos).
2. Model `useValidateAccessModel`:
   - pega a posição com `expo-location` (`Accuracy.High`) com **tempo limite de 8 s** (envolva em `Promise.race`, porque a função não tem *timeout* próprio). Use `coords.accuracy` como `precisaoMetros`. Sem permissão: T08 ("Precisamos da sua localização para confirmar que você está perto da catraca.", "Permitir localização", "Agora não"; negada → "Abrir configurações");
   - mostra T09: "Verificando sua localização…" e depois "Validando seu acesso…", sem botão de cancelar;
   - chama o serviço **uma vez** (`retry: 0`);
   - converte a resposta num **resultado** (valor, não exceção): `{ tipo: "AUTORIZADO", local, usosRestantes }`, `{ tipo: "NEGADO", motivo }`, `{ tipo: "SEM_CONEXAO" }` ou `{ tipo: "ERRO_SERVIDOR" }`. 401 segue o fluxo de sessão expirada. Código desconhecido num 403 → trate como `ERRO_SERVIDOR` e registre (sem dados sensíveis).
3. `src/lib/denialReasons.ts`: a tabela do `03-contract-for-the-app.md` (seção 2) (texto, tom, ícone, botão) num só lugar. A tela nunca escreve o texto de motivo à mão.
4. **T10:** fundo `resultadoAutorizado`, selo cookie com o check, "Acesso autorizado", "Pode passar pela catraca.", nome do local, "Restam {n} entradas" e "Concluir" (volta ao início). Vibração de sucesso.
5. **T11:** fundo âmbar (`resultadoTente`) ou vermelho (`resultadoNegado`) conforme o motivo, ícone do motivo, "Acesso negado", o texto do motivo e os dois botões. "Ler outro QR Code" e "Tentar de novo" voltam ao leitor; "Ver minhas autorizações" abre a T04; "Voltar ao início". Vibração de erro.
6. **Animação:** selo com mola (escala 0,55 → 1,08 → 0,97 → 1 em cerca de 0,6 s) com o `Animated` do próprio React Native. A vibração e o anúncio do leitor de tela disparam **quando a resposta chega**, sem esperar a animação. Com animação reduzida, abre pronto. Se a animação ameaçar a meta de 3 s, ela sai.
7. 💡 Em `__DEV__`, um seletor "Simular posição" (na catraca / a 200 m) para ensaiar o `DISTANTE_DO_TERMINAL` sem sair andando.

**Lista de testes**

- [ ] U `denialReasons`: os 10 motivos têm texto igual ao contrato (seção 4.4 do arquivo 03), tom, ícone e botão da tabela do `tokens.md`.
- [ ] U model: sucesso envia `payload`, `latitude`, `longitude` e `precisaoMetros` e devolve `AUTORIZADO` com local e usos restantes.
- [ ] U model: um teste para **cada** um dos 10 motivos → `NEGADO` com o motivo certo.
- [ ] U model: sem rede e tempo esgotado → `SEM_CONEXAO`; 500 → `ERRO_SERVIDOR`; o serviço é chamado **uma** vez (sem repetição automática).
- [ ] U model: permissão de localização negada → mostra a T08 e **não** chama o serviço.
- [ ] U model: posição não obtida em 8 s (GPS desligado) → envia sem coordenadas e mostra o `LOCALIZACAO_INVALIDA` que o servidor devolver (❓ 6).
- [ ] U model: toque duplo ou nova leitura durante a validação não chama o serviço de novo.
- [ ] U tela T11: nenhum código técnico aparece na tela em nenhum motivo.
- [ ] U tela: o resultado é anunciado como alerta pelo leitor de tela.

**Critérios de aceitação**

- [ ] Do QR lido ao resultado em menos de 3 s no caminho feliz, com a posição já obtida.
- [ ] Cada um dos 10 motivos mostra o texto, o tom, o ícone e os botões certos, sem código técnico.
- [ ] O resultado nunca depende só da cor: ícone, título e texto sempre presentes.
- [ ] Localização negada leva à explicação e às configurações, sem travar.
- [ ] Com o terminal (ou o simulador) e o backend reais, o app e a catraca mostram a mesma decisão.

**Definição de pronto**

- [ ] Ensaio com Eduardo e Matheus: cenários 1 a 7 do M4 (`STATUS.md`) passando.
- [ ] GIF de um autorizado, um âmbar e um vermelho no PR.

---

### F09 — Minhas autorizações (RF08)

- **Depende de:** F04; **B09** (`GET /me/authorizations`, falso até sair) · **Libera:** F14; contador da T03
- **Prazo:** 08/11 · **Prioridade:** 🔴 · **Telas:** [T04 Minhas autorizações](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-15), [T05 Detalhe](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-70) (🟢 extra)
- **Objetivo:** a pessoa entende em 10 s se pode entrar, onde, quando e quantas vezes.

**Contrato** (de `05-steps-B06-B10.md`, B08/B09; ❓ 5): `GET /me/authorizations?situacao=` devolve só as do usuário do token, ordenadas por `dataFim`. Cada item tem o formato da resposta da B08: `usuario`, `local { nome, tipo, edificio { nome } }`, `dataInicio`, `dataFim`, `horaInicio`, `horaFim`, `usosPermitidos`, `usosRealizados`, `usosRestantes`, `situacao`, `situacaoEfetiva`, `criadoPor`, `criadoEm`, `canceladoPor`, `canceladoEm`, `motivoCancelamento`. ❓ 7: a rota é paginada?

**O que fazer**

1. Tipos `Autorizacao` e `SituacaoEfetiva` em `lib/types/authorization.ts` (serão reusados na F07 e na F08).
2. `lib/formatters.ts`: `formatDate("2026-10-20")` → `20/10/2026`, `formatDateShort` → `20/10`, `formatTime("08:00")`, `formatInstant(iso)` em São Paulo (`Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" })`; confira no celular que o Hermes formata o fuso certo).
3. **T04:** seção **Ativas** (cartões grandes: nome do local em destaque, "Válida de 20/10 a 25/10", "Das 08:00 às 18:00", "Entradas: restam 2 de 3" com a barra de progresso, selo "Ativa"); aviso "Agora está fora do horário permitido." quando a autorização está ativa mas fora da janela neste momento (calculado no app com a hora de São Paulo, só como aviso); seção **Anteriores** recolhida ("Ver anteriores ({n})") com expiradas, esgotadas e canceladas; botão fixo "Abrir catraca"; vazio "Você ainda não tem autorizações. Procure a administração."; puxar para atualizar.
4. Use `situacaoEfetiva` da API para separar ativas e anteriores. Não recalcule a situação no app.
5. Contador "{n} ativa(s)" na T03 reaproveitando a mesma consulta (mesma `queryKey`).

**Lista de testes**

- [ ] U formatters: datas, horas e instantes em São Paulo (inclusive um instante perto da meia-noite UTC).
- [ ] U model: separa ativas e anteriores pela `situacaoEfetiva`; ativas primeiro.
- [ ] U model: aviso de fora do horário com o relógio antes, dentro e depois da janela (limites inclusivos).
- [ ] U tela: os quatro selos (Ativa, Cancelada, Expirada, Esgotada) com texto e ícone; lista vazia; erro com "Tentar novamente".

**Critérios de aceitação**

- [ ] A pessoa vê **só** as próprias autorizações (confira com o visitante e o condômino do seed).
- [ ] Ativas primeiro; o resto em "Anteriores".
- [ ] Datas e horas em `dd/MM/aaaa` e `HH:mm`, fuso de São Paulo.
- [ ] "Abrir catraca" leva ao leitor.

**Definição de pronto**

- [ ] Uma pessoa que não conhece o sistema diz em 10 s se pode entrar (anote no PR).

---
