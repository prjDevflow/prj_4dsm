# 04 — Etapas F01 a F04: fundação, login e navegação

Carregue este arquivo quando a etapa atual estiver entre F01 e F04. Antes de começar, leia `02-tdd-workflow.md` (DoD comum) e `01-architecture.md`. Ordem e prazos: `STATUS.md`.

Legenda: 📄 exigência do documento oficial do desafio · 💡 decisão ou sugestão do time (pode mudar) · ★ entrega que destrava outra pessoa · ❓ pergunta em aberto (lista no [STATUS.md](STATUS.md)) · 🔴 essencial · 🟡 importante · 🟢 pode ser cortada se faltar tempo.

---

### F01 — Setup do app

- **Depende de:** nada no app; B01 ✅ (`/health`) · **Libera:** todo o app
- **Prazo:** 30/10 · **Prioridade:** 🔴 · **Telas:** nenhuma (uma tela provisória que mostra o `/health`)
- **Objetivo:** o app abre no seu celular pelo Expo Go, com a estrutura do `01-architecture.md`, testes rodando no CI e o cliente HTTP falando com a API.

**O que fazer**

1. Na raiz do repositório: `npx create-expo-app@latest mobile` (template padrão, com Expo Router e TypeScript). Apague os exemplos do template.
2. Mova as rotas para `src/app/` (o Expo Router aceita `src/app`) e crie a árvore do `01-architecture.md` (seção 3), só com as pastas que esta etapa usa.
3. `tsconfig.json`: estende `expo/tsconfig.base`, com `"strict": true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` (iguais ao estudos_dpi) e `paths` `@/*` → `./src/*` e `@test/*` → `./test/*`.
4. Dependências (versões pelo `npx expo install`; as que não são nativas, por `npm install`):
   - app: `@tanstack/react-query`, `axios`, `zustand`, `react-hook-form`, `@hookform/resolvers`, `zod`, `expo-secure-store`, `expo-camera`, `expo-location`, `expo-haptics`, `expo-clipboard`, `expo-font`, `react-native-svg`, `@react-native-community/netinfo`, `@react-native-community/datetimepicker`;
   - desenvolvimento: `jest`, `jest-expo`, `@testing-library/react-native`, `msw`, `eslint` com `eslint-config-expo`, `prettier`, `@types/jest`. Opcional: `@stoplight/prism-cli`.
   - 💡 As da lista já foram combinadas no plano do time. Qualquer outra, pergunte ao Eduardo (`08-commits-and-prs.md` e `AGENTS.md`).
5. Scripts no `package.json`: `start`, `test`, `test:watch`, `test:cov`, `lint`, `typecheck` (`tsc --noEmit`), `format`, `format:check` e, opcional, `mock`.
6. Jest: preset `jest-expo`, `moduleNameMapper` para `@/` e `@test/`, `jest.setup.ts` com o mock do `expo-secure-store` em memória e o servidor do MSW (`beforeAll(listen)`, `afterEach(resetHandlers)`, `afterAll(close)`).
7. `src/lib/env.ts`: lê `EXPO_PUBLIC_API_URL` (obrigatória, termina em `/api/v1`) e `EXPO_PUBLIC_FAKE_SERVICES`, uma vez, e falha com mensagem clara se faltar a URL. `.env.example` versionado; `.env` no `.gitignore`.
8. `ApiError`, `AxiosInstance`, `SessionStore`, `tokenStorage` e `container` do `01-architecture.md` (seções 4 e 6).
9. Primeiro serviço: `GetHealthService` (`GET /health`) e uma tela provisória que mostra "API: ok" ou "API: fora do ar".
10. `app.json`: nome provisório "Passe" (❓ 1), orientação `portrait`, textos das permissões de câmera e localização em português (`expo-camera` e `expo-location` têm *config plugins* para isso).
11. **CI do app** ★ (precisa do OK do Eduardo, porque mexe no workflow): no `.github/workflows/ci.yml`, um job `mobile` que roda `npm ci`, `lint`, `typecheck`, `format:check` e `test:cov` quando `mobile/**` muda, e um job de passagem `mobile-ci` (mesmo padrão do `backend-ci`, para PRs de outras pastas não ficarem presos). O Eduardo decide se `mobile-ci` entra como check obrigatório no ruleset.
12. `mobile/README.md` (como rodar, como apontar para a API, como ligar falsos) e `mobile/docs/ai/STATUS.md`. Corrija a linha "App mobile" do README raiz.

**Lista de testes**

- [x] U `env`: falha com mensagem clara sem `EXPO_PUBLIC_API_URL`; lê a lista de falsos separada por vírgula (vazia = nenhum).
- [x] U `AxiosInstance`: envia `Authorization: Bearer <token>` quando há sessão e não envia quando não há (MSW).
- [x] U `AxiosInstance`: corpo `{ error: { code, message, details } }` vira `ApiError` com os mesmos campos (MSW).
- [x] U `AxiosInstance`: sem resposta vira `ApiError` `NETWORK`; tempo esgotado vira `TIMEOUT`.
- [x] U `AxiosInstance`: 401 com sessão aberta chama `expireSession`; 401 sem sessão (login) não chama.
- [x] U `SessionStore`: `signIn` salva o token no armazenamento seguro; `signOut` apaga; `expireSession` marca `expired`.
- [x] U `GetHealthService`: chama `GET /health` e devolve `status` e `db`.

**Critérios de aceitação**

- [ ] O app abre no seu celular pelo Expo Go e mostra "API: ok" com o backend do Docker rodando. (conferido no emulador Android com o Expo Go e o mock; falta no celular com o backend do Docker)
- [x] Desligar o backend mostra "API: fora do ar" sem fechar o app. (emulador: mock desligado e "Tentar novamente")
- [x] Trocar `EXPO_PUBLIC_API_URL` (local ou outra máquina) não exige mudar código.
- [x] `npm test`, `npm run lint`, `npm run typecheck` e `npm run format:check` passam no seu computador e no CI. (job `mobile` verde no GitHub Actions, run 40692035226)

**Definição de pronto**

- [x] README do app permite que o Eduardo rode o app no celular dele em 10 minutos.
- [ ] Job de CI do app rodando no PR (ou, se o Eduardo ainda não aprovou, o PR explica e o CI fica para um PR dele). (jobs `mobile` e `mobile-ci` no PR, aguardando o aval do Eduardo)
- [ ] Print do app no celular anexado ao PR. (prints do emulador anexados; falta o do celular)

---

### F02 — Tema e componentes base (RNF04)

- **Depende de:** F01 · **Libera:** todas as telas
- **Prazo:** 01/11 · **Prioridade:** 🔴 · **Telas:** [Fundamentos](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-705), componentes (Forma, Botão, Selo de situação, Filtro, Campo), [T31 Estados compartilhados](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-556)
- **Objetivo:** construir uma vez os blocos visuais e acessíveis, com os valores do `tokens.md`, para todas as telas ficarem iguais ao Figma.

**O que fazer**

1. `src/theme/`: `colors.ts` (todos os tokens de cor do `tokens.md`, com os mesmos nomes em camelCase: `fundo`, `superficieAlta`, `primaria`, `acao`, `resultadoAutorizado`…), `typography.ts` (as duas escalas: **Pessoa** com corpo 18 e botão 20; **Admin** com corpo 16 e botão 16; entrelinha 110% em títulos e 135% em texto), `spacing.ts` (4, 8, 12, 16, 24, 32; margem lateral 16), `radius.ts` e um `ThemeProvider`. Tema escuro é o padrão (❓ 2).
2. Fonte **Atkinson Hyperlegible Next** (400, 700, 800) com `expo-font`. Confira se existe o pacote `@expo-google-fonts/atkinson-hyperlegible-next`; se não existir, baixe os `.ttf` do Google Fonts para `src/assets/fonts/` e carregue com `useFonts`. A splash nativa só some quando a fonte carregar.
3. `components/shapes/`: `Cookie12`, `Clover4`, `Arch`, `Sun8`, `Circle` com `react-native-svg`, usando os caminhos do `tokens.md` (viewBox `0 0 100 100`, cor por prop).
4. `components/Icon.tsx`: um único componente `Icon name="..."` para todo o app (❓ 4). Todo ícone sozinho num botão tem `accessibilityLabel`.
5. `components/ui/` (exportados por um `index.ts`), com os nomes e variantes do Figma:

| Componente | Variantes e regras |
|---|---|
| `Text` | variantes da tipografia (`pessoaTitulo`, `pessoaCorpo`, `adminItem`…); respeita a fonte do sistema (`allowFontScaling`), com `maxFontSizeMultiplier` só se o Rafael aprovar |
| `Button` | Principal, Tonal, Contorno, Texto, Perigo, Perigo contorno, Catraca × tamanho Pessoa (60) e Admin (48); em pílula; `loading` com `loadingLabel` bloqueia novos toques; `disabled`; largura total |
| `TextField` | rótulo sempre visível acima; ajuda; erro com ícone e texto; somente leitura; caixa de 52; aceita `ref` (para o `setFocus` do react-hook-form) |
| `PasswordField` | `TextField` com "Mostrar"/"Ocultar" (rótulo de acessibilidade "Mostrar senha"/"Ocultar senha", toque 48 × 48) |
| `SelectField` | abre lista em tela cheia ou folha inferior, com busca opcional |
| `DateField`, `TimeField` | seletor nativo (`@react-native-community/datetimepicker`); mostra `dd/MM/aaaa` e `HH:mm`; entrega `YYYY-MM-DD` e `HH:mm` |
| `NumberStepper` | "−" e "+" grandes, valor central, mínimo e máximo |
| `SwitchField` | interruptor 52 × 32 com rótulo que também recebe o toque |
| `FilterChip` | selecionado (com check) e padrão (contorno) |
| `StatusBadge` | Sucesso, Erro, Neutro, Aviso, Primário (26 de altura); texto + ícone + cor; mapeia `ATIVA`, `CANCELADA`, `EXPIRADA`, `ESGOTADA`, `AUTORIZADO`, `NEGADO`, `Online`, `Offline`, `Inativo` |
| `Card`, `ListItem`, `NavRow` | cartão; item de lista com título, subtítulo, selo e chevron; linha de navegação (`superficieAlta`, raio 20, 64 de altura) |
| `ProgressBar` | entradas restantes ÷ total (dois retângulos de 8 de altura) |
| `Alert` | faixa de aviso/erro com `accessibilityRole="alert"` (anunciada pelo leitor de tela) |
| `Dialog` | confirmação com título, texto e dois botões; o botão perigoso nomeia a ação |
| `Toast` | aviso curto (`inverso`, raio 8, cerca de 3 s), anunciado pelo leitor de tela; nunca para erro importante |
| `LoadingState`, `EmptyState`, `ErrorState`, `OfflineBanner` | os estados da T31: "Carregando…" com o cookie girando, vazio com ícone e texto, erro com "Tentar novamente", faixa "Sem internet" |
| `ScreenContainer`, `Header` | área segura, rolagem, teclado que não cobre o campo (`KeyboardAvoidingView`); título com "Voltar" |
| `Fab` | botão flutuante (`primariaContainer`, raio 16, 56 de altura) |

6. Respeite **animação reduzida** (`AccessibilityInfo.isReduceMotionEnabled`): sem animação, tudo abre pronto.
7. Uma tela de **catálogo** só em desenvolvimento (`__DEV__`) com todos os componentes e estados, para revisar com o Rafael.

**Lista de testes**

- [ ] U `Button`: em `loading` mostra o `loadingLabel`, fica com estado "ocupado" e não chama `onPress` de novo.
- [ ] U `Button`: cada variante usa as cores do `tokens.md` (fundo e texto).
- [ ] U `TextField`: mostra o rótulo, a ajuda e o erro com ícone; o erro é anunciado.
- [ ] U `PasswordField`: "Mostrar" revela, "Ocultar" esconde, sem perder o texto; o rótulo de acessibilidade muda junto.
- [ ] U `NumberStepper`: não passa do mínimo nem do máximo; "−" desabilita no mínimo.
- [ ] U `StatusBadge`: cada situação tem texto, ícone e cor próprios.
- [ ] U `Dialog`: confirmar e cancelar chamam as funções certas.
- [ ] U `ErrorState`: "Tentar novamente" chama `onRetry`.

**Critérios de aceitação**

- [ ] O catálogo mostra todos os componentes iguais ao Figma, no celular.
- [ ] Todo componente interativo tem `accessibilityRole` e `accessibilityLabel`.
- [ ] Com a fonte do celular no máximo, nenhum texto do catálogo fica cortado ou sobreposto.
- [ ] Botão em carregamento não dispara duas ações no toque duplo.
- [ ] Erro de campo aparece com ícone e texto, não só com cor.

**Definição de pronto**

- [ ] Catálogo revisado pelo Rafael (print ou chamada) e pelo Eduardo.
- [ ] Prints do catálogo no PR.

---

### F03 — Login (RF07)

- **Depende de:** F02; B05 ✅ · **Libera:** F04 e todas as telas protegidas
- **Prazo:** 03/11 · **Prioridade:** 🔴 · **Telas:** [T02 Login](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=3-156)
- **Objetivo:** qualquer pessoa entra no app com e-mail e senha, de forma simples e segura. O código completo está no `01-architecture.md`, seção 4.

**Contrato:** `POST /auth/login` com `{ email, senha }` → 200 `{ accessToken, tokenType, expiresIn, usuario: { id, nome, email, perfil } }`; 401 `CREDENCIAIS_INVALIDAS`; 403 `USUARIO_INATIVO`; 422 `VALIDATION_ERROR`; 429 `RATE_LIMITED` (5 tentativas por minuto por IP e e-mail).

**Comportamento**

| Item | Regra |
|---|---|
| E-mail | teclado de e-mail, sem capitalização e sem correção automática, remove espaços nas pontas, envia em minúsculas, até 254; "Próximo" do teclado vai para a senha |
| Senha | oculta por padrão, até 72; "Entrar" do teclado envia |
| Validação | ao tocar em "Entrar", mensagens nos campos, foco no primeiro com erro e **nenhuma requisição** |
| Enviando | botão "Entrando…" com o cookie girando, campos desabilitados, toque duplo ignorado |
| Erro do envio | faixa acima do botão com a mensagem (tabela abaixo); e-mail mantido; **senha limpa e foco na senha** |
| Sucesso | token no armazenamento seguro; o guard abre a T14 (ADMIN) ou a T03 (CONDOMINO, VISITANTE); "voltar" do Android não volta ao login |
| Sessão expirada | se veio de um 401, mostra "Sua sessão expirou. Entre novamente." |

| Situação | Mensagem |
|---|---|
| E-mail vazio · inválido · senha vazia | "Informe seu e-mail." · "Digite um e-mail válido. Exemplo: nome@email.com" · "Informe sua senha." |
| 401 `CREDENCIAIS_INVALIDAS` | E-mail ou senha incorretos. Confira e tente de novo. |
| 403 `USUARIO_INATIVO` | Seu cadastro está inativo. Procure a administração. |
| 429 `RATE_LIMITED` | Muitas tentativas. Aguarde um minuto e tente de novo. |
| Sem rede ou tempo esgotado | Sem conexão com o servidor. Verifique sua internet e tente de novo. |
| 5xx ou desconhecido | Não foi possível entrar agora. Tente novamente em instantes. |

**Lista de testes**

- [ ] U schema: e-mail vazio, e-mail sem "@", senha vazia → as três mensagens; e-mail com espaços nas pontas é aceito.
- [ ] U `loginErrorMessage`: um teste por linha da tabela de erros.
- [ ] U model: campos vazios não chamam o serviço.
- [ ] U model: sucesso envia o e-mail em minúsculas e abre a sessão com o perfil certo.
- [ ] U model: cada erro da API mostra a mensagem, limpa a senha e mantém o e-mail.
- [ ] U model: toque duplo em "Entrar" chama o serviço **uma** vez.
- [ ] U tela: "Mostrar"/"Ocultar" senha; erros anunciados com `role` de alerta.
- [ ] U `LoginUserService` (MSW): `POST /auth/login` com `{ email, senha }`.

**Critérios de aceitação**

- [ ] "Entrar" com os dois campos vazios mostra as duas mensagens e não envia nada.
- [ ] Credenciais do seed levam ao início certo de cada perfil (admin, condômino, visitante) em menos de 2 s na rede local.
- [ ] Credenciais erradas mostram a faixa, limpam a senha e põem o foco nela.
- [ ] Sem internet mostra a mensagem de conexão e o botão volta a funcionar.
- [ ] O teclado não cobre o botão "Entrar" nem o campo em edição.
- [ ] Com o leitor de tela (TalkBack ou VoiceOver), campos, botão e erros são anunciados.

**Definição de pronto**

- [ ] Testado com os três usuários do seed na API real.
- [ ] GIF do sucesso e do erro no PR.

---

### F04 — Abertura, navegação por perfil, início e sessão

- **Depende de:** F03; B05 ✅ (`GET /auth/me`) · **Libera:** F05, F06, F09, F10, F12
- **Prazo:** 04/11 · **Prioridade:** 🔴 · **Telas:** [T01 Abertura](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=3-140), [T03 Início do usuário](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=3-184), [T13 Minha conta](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-299), [T14 Início do administrador](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-48)
- **Objetivo:** cada perfil cai no início certo, a sessão sobrevive ao fechamento do app e termina com segurança.

**O que fazer**

1. **T01 (`screens/Auth/splash/`):** logo e "Carregando…" com o cookie. O model lê o token do armazenamento seguro; sem token → login; com token → `GET /auth/me` (o servidor relê perfil e `ativo` do banco a cada chamada) → guarda o usuário e abre o início; 401 → apaga o token e vai ao login; sem rede → mostra erro com "Tentar novamente" (não apaga o token).
2. **Guards** em `app/_layout.tsx` e `app/(app)/admin/_layout.tsx` (`01-architecture.md`, seção 4).
3. **T03 (pessoa):** saudação "Olá, {primeiro nome}"; botão grande "Abrir catraca" (cor `acao`, 100 de altura) com "Ler o QR Code"; linha "Minhas autorizações" com a contagem de ativas (vem da F09; até lá, sem contador); "Meu histórico" (F12); "Minha conta"; faixa "Sem internet" quando offline (`netinfo`).
4. **T14 (administrador):** blocos Usuários, Locais e terminais, Autorizações, Tags NFC e Histórico, cada um com a cor e a forma da área (`area/*` do `tokens.md`), e o botão flutuante amarelo "Abrir catraca". Os blocos levam a telas "Em breve" até as etapas F05 em diante.
5. **T13 Minha conta:** nome, e-mail e perfil (somente leitura; não há troca de senha no contrato) e o botão "Sair".
6. **Sair:** diálogo "Deseja sair?" com "Cancelar" e "Sair". Confirmando: `signOut()`, `queryClient.clear()` (para não sobrar dado do usuário anterior) e volta ao login.
7. **Sessão expirada:** já tratada no `AxiosInstance` (F01); confira que qualquer tela protegida volta ao login com o aviso.
8. 💡 O bloco "Você pode entrar agora" da T03 está marcado como **Ideia** no design (❓ 3): só implemente depois do aval do grupo.

**Lista de testes**

- [ ] U splash model: sem token → sem usuário e sem chamar `/auth/me`.
- [ ] U splash model: token válido → chama `/auth/me` e guarda o usuário.
- [ ] U splash model: `/auth/me` com 401 → apaga o token; sem rede → mantém o token e mostra erro.
- [ ] U home: primeiro nome na saudação ("Maria Souza" → "Olá, Maria").
- [ ] U home admin: os cinco blocos e o "Abrir catraca" aparecem; home da pessoa não mostra blocos de administração.
- [ ] U logout model: só sai depois de confirmar; limpa o token e o cache.
- [ ] U tela: faixa "Sem internet" aparece quando o `netinfo` diz offline.

**Critérios de aceitação**

- [ ] Abrir o app já logado leva direto ao início certo, sem pedir senha.
- [ ] Token expirado ou conta desativada leva ao login (com o aviso de sessão expirada quando veio de um 401).
- [ ] Condômino e visitante nunca veem os blocos de administração.
- [ ] Depois de "Sair", o "voltar" do Android não volta ao início.
- [ ] Trocar de usuário (admin → visitante) no mesmo celular não deixa dados do anterior.

**Definição de pronto**

- [ ] GIF de abrir já logado, sair e entrar com outro perfil.

---
