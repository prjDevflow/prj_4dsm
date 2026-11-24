<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:17364F,100:0A7C66&height=180&section=header&text=Passe%20%C2%B7%20App&fontSize=46&fontColor=ffffff&fontAlignY=38&desc=App%20mobile%20do%20controle%20de%20acesso%20%7C%20ABP%202026-2&descAlignY=60&descSize=16&animation=fadeIn" width="100%" />

<br/>

[![Mobile CI](https://github.com/prjDevflow/prj_4dsm/actions/workflows/mobile-ci.yml/badge.svg?branch=develop)](https://github.com/prjDevflow/prj_4dsm/actions/workflows/mobile-ci.yml)
[![Baixar o .apk](https://img.shields.io/badge/Android-baixar%20o%20.apk-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://drive.google.com/file/d/1M1OytRAJl5BhUIH2k1wB6q3Zz4Szizgz/view?usp=sharing)
[![API no ar](https://img.shields.io/badge/API-homologa%C3%A7%C3%A3o-0A7C66?style=for-the-badge&logo=microsoftazure&logoColor=white)](https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/docs)
[![Expo](https://img.shields.io/badge/Expo-SDK%2058-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.88-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Jest](https://img.shields.io/badge/Jest-30-C21325?style=for-the-badge&logo=jest&logoColor=white)](https://jestjs.io/)

</div>

---

## Sobre o app

> O app mobile é a parte do **Passe** que as pessoas usam no celular. Ele fala só com a API, nunca com o terminal.

O app atende dois públicos:

- **Pessoa que passa pela catraca** (condômino ou visitante): lê o QR Code do terminal, envia o QR e a posição do celular à API e mostra a decisão. Ela também vê as próprias autorizações e o próprio histórico.
- **Administrador:** cadastra usuários, locais, terminais, autorizações e tags NFC. Ele também consulta o histórico de acessos.

Stack: Expo SDK 58 (Expo Go), Expo Router, React Native 0.88, TypeScript (`strict`), TanStack Query, axios, zustand, react-hook-form + zod, Jest + Testing Library + MSW.

Contexto para IA e documentação técnica: [.claude/AGENTS.md](.claude/AGENTS.md) e [.claude/](.claude/). Comece pelo [00-onboarding.md](.claude/00-onboarding.md).

---

## Baixar o app (Android)

Para usar o app sem instalar nada no computador, instale o `.apk` num celular Android.

> [!IMPORTANT]
> O `.apk` é **só para Android**. Ele não instala no iPhone (iOS). No iPhone, use o Expo Go (ver [Rodar no celular com o Expo Go](#rodar-no-celular-com-o-expo-go)).

<div align="center">

| Arquivo                                                                                                             | Versão  | Sistema    | Data       | Tamanho |
| :------------------------------------------------------------------------------------------------------------------ | :------ | :--------- | :--------- | :------ |
| [**Passe para Android (.apk)**](https://drive.google.com/file/d/1M1OytRAJl5BhUIH2k1wB6q3Zz4Szizgz/view?usp=sharing) | `0.1.0` | só Android | 18/11/2026 | 117 MB  |

</div>

1. Abra o link no celular Android.
2. Toque em **Baixar**. O Google Drive avisa que não pode verificar o arquivo. Toque em **Baixar mesmo assim**.
3. Abra o arquivo baixado.
4. Se o Android pedir, permita a instalação de apps desta fonte (navegador ou Google Drive).
5. Toque em **Instalar** e depois em **Abrir**.
6. Entre com uma conta de [Usuários da homologação](../backend/README.md#usuários-da-homologação).

> [!NOTE]
> O `.apk` não está na Play Store. Por isso, o Android mostra avisos de segurança na instalação.

> [!IMPORTANT]
> Para ler o QR Code, o app pede a câmera. Para validar o acesso, o app pede a localização. Permita as duas. A API nega o acesso se o celular está a mais de 100 m do terminal.

---

## API em homologação

A API de homologação está no ar desde 17/11/2026. O app pode usar esta API sem o backend no seu computador.

<div align="center">

| Recurso            | Endereço                                                                                     |
| :----------------- | :------------------------------------------------------------------------------------------- |
| Base da API        | `https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/api/v1`           |
| Swagger (contrato) | [/docs](https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/docs)      |
| Contas de teste    | [Usuários da homologação](../backend/README.md#usuários-da-homologação) no README do backend |

</div>

> [!NOTE]
> O banco da homologação (Neon gratuito) para quando fica sem uso. O primeiro login depois disso demora mais.

---

## Começar

<details open>
<summary><b>Pré-requisitos</b></summary>
<br>

- **Node.js 22.18** ou superior no computador.
- **Expo Go** no celular (Play Store ou App Store).
- Celular e computador **na mesma rede Wi-Fi**. Se a rede bloqueia, use o modo túnel (ver [Rodar no celular com o Expo Go](#rodar-no-celular-com-o-expo-go)).

</details>

<details open>
<summary><b>Instalar</b></summary>
<br>

```bash
cd mobile
npm ci
cp .env.example .env   # no PowerShell: Copy-Item .env.example .env
```

No `.env`, troque o IP pelo IP do seu computador. Para ver o IP, use `ipconfig` no Windows ou `ip addr` no Linux e no macOS. No celular, `localhost` é o próprio celular. Por isso, use o IP.

```bash
# EXPO_PUBLIC_API_URL=http://192.168.0.15:3000/api/v1
```

Para instalar um pacote nativo, use `npx expo install`. Não adicione uma biblioteca que exige development build ou `expo prebuild`. O app roda só no Expo Go.

</details>

<details>
<summary><b>Variáveis do <code>.env</code></b></summary>
<br>

| Variável                    | Exemplo                           | Uso                                                         |
| --------------------------- | --------------------------------- | ----------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`       | `http://192.168.0.15:3000/api/v1` | URL da API, sempre com `/api/v1` no fim (obrigatória)       |
| `EXPO_PUBLIC_FAKE_SERVICES` | vazio                             | serviços falsos, separados por vírgula; vazio = todos reais |

- Sem `EXPO_PUBLIC_API_URL`, o app para com a mensagem "EXPO_PUBLIC_API_URL não definida".
- As variáveis `EXPO_PUBLIC_*` vão dentro do app. Nunca coloque segredos nelas.
- O `.env` nunca vai para o Git.

</details>

---

## Rodar no celular com o Expo Go

1. Suba a API. Use a [homologação](#api-em-homologação), o backend no Docker ([backend/docs/ambiente-dev.md](../backend/docs/ambiente-dev.md)) ou o [mock](#apontar-para-a-api-real-ou-para-o-mock).
2. Inicie o Expo:

   ```bash
   npm start
   ```

3. Leia o QR Code do Expo com o Expo Go (Android) ou com a câmera (iPhone).
4. Se a rede bloqueia, use `npx expo start --tunnel`.

O app abre no **login** (T02). A sessão fica guardada. Quando você abre o app de novo, a abertura (T01) confere o token com `GET /auth/me` e vai direto ao início.

<details>
<summary><b>Contas do seed (backend no seu computador)</b></summary>
<br>

Com a API no Docker e o seed do backend, use estas contas:

| Perfil        | E-mail                | Senha              | Abre em                 |
| ------------- | --------------------- | ------------------ | ----------------------- |
| Administrador | `admin@dev.local`     | `Admin-Dev-2026`   | início do administrador |
| Condômino     | `condomino@dev.local` | `Usuario-Dev-2026` | início da pessoa        |
| Visitante     | `visitante@dev.local` | `Usuario-Dev-2026` | início da pessoa        |

Estas senhas são públicas, do `backend/.env.example`. Use-as só em desenvolvimento. Na homologação, use as contas de [Usuários da homologação](../backend/README.md#usuários-da-homologação).

</details>

<details>
<summary><b>O que cada bloco do início abre</b></summary>
<br>

**Administrador:**

- "Usuários" (F05): cadastro e consulta de usuários.
- "Locais e terminais" (F06): edifícios, pontos de acesso e terminais.
- "Autorizações" (F07 e F08): criar, consultar e cancelar autorizações.
- "Tags NFC" (F13): vincular, consultar e desativar tags, também pelo modo de cadastro do terminal.
- "Histórico" (F12): tentativas aprovadas e negadas, com filtros.

**Pessoa:**

- "Minhas autorizações" (F09): as autorizações da pessoa. O início mostra quantas estão ativas.
- "Abrir catraca" (F10): abre o leitor de QR Code.
- Validação (F11): com um QR válido, o app confere a localização, chama a API e mostra o resultado.
- "Meu histórico" (F12): as tentativas da pessoa.

**Chave do terminal.** A chave de um terminal novo, ou gerada de novo, aparece uma única vez, na tela "Chave do terminal". O app não guarda a chave. Anote a chave ou toque em "Copiar chave" antes de tocar em "Concluir".

</details>

<details>
<summary><b>Testar o leitor sem câmera e sem estar na catraca</b></summary>
<br>

Em desenvolvimento, o leitor mostra dois recursos a mais:

- **"Texto do QR Code":** cole um `ACS1:...` sem usar a câmera. Para gerar um, use `npm run dev:qr` no backend.
- **"Simular posição":** "Na catraca" usa a posição do seed. "A 200 m" testa o `DISTANTE_DO_TERMINAL`.

Sem simular e longe da catraca, a API nega por distância.

No Android, o Expo Go guarda por projeto a câmera negada. Libere a câmera nas configurações. Quando você volta ao app, ele pergunta de novo.

</details>

---

## Apontar para a API real ou para o mock

A URL da API vem só da variável `EXPO_PUBLIC_API_URL`. Para trocar o destino, troque a linha do `.env` e reinicie o Expo com `npx expo start --clear`. Nenhum código muda.

| Destino                    | `EXPO_PUBLIC_API_URL`                                                              | Como subir                                                            |
| -------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Homologação                | `https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/api/v1` | já está no ar                                                         |
| API real no seu computador | `http://<IP>:3000/api/v1`                                                          | `docker compose up -d` no `backend/` (migrate e seed na primeira vez) |
| Mock do `openapi.yaml`     | `http://<IP>:4010/api/v1`                                                          | `npm run mock` em outro terminal                                      |

O mock (`npm run mock`) é o Prism. Ele lê o `../backend/openapi.yaml` e devolve os exemplos do contrato, no mesmo prefixo `/api/v1` da API real. Ele conhece só as rotas do `openapi.yaml`.

---

## Serviços falsos

Cada serviço tem uma versão falsa em `src/service/fakes/`. Use os falsos quando uma rota não existe no backend, ou para testar sem hardware. Liste os nomes em `EXPO_PUBLIC_FAKE_SERVICES`, separados por vírgula. Vazio = todos reais.

```bash
EXPO_PUBLIC_FAKE_SERVICES=getHealth,loginUser
```

Os nomes aceitos são as chaves de `createServices` em [src/service/container.ts](src/service/container.ts).

<details>
<summary><b>O que cada serviço falso faz</b></summary>
<br>

| Nome              | O que troca                                                                             |
| ----------------- | --------------------------------------------------------------------------------------- |
| `getHealth`       | a consulta de saúde da API                                                              |
| `loginUser`       | o login; aceita os três usuários e senhas do seed                                       |
| `getMe`           | o `GET /auth/me`; reconhece o token do login falso                                      |
| `users`           | os quatro serviços de `/users` (listar, obter, cadastrar, alterar), juntos              |
| `locations`       | edifícios, pontos de acesso e terminais, juntos                                         |
| `authorizations`  | criar, listar, minhas, obter e cancelar autorizações, juntos                            |
| `currentPosition` | a localização do aparelho                                                               |
| `clipboard`       | a área de transferência                                                                 |
| `camera`          | o que o leitor pede ao aparelho: permissão da câmera, vibrações e configurações         |
| `position`        | a localização da validação                                                              |
| `validateQr`      | a validação do QR                                                                       |
| `accessEvents`    | o histórico do administrador e o "Meu histórico", com exemplos dos últimos dias         |
| `nfcTags`         | as tags e o modo de cadastro do terminal; sem hardware, o falso "lê" uma tag 4 s depois |

- `users` guarda uma lista em memória com os usuários do seed e mais 22 pessoas. Assim, a rolagem infinita aparece. A lista segue as regras da API, como e-mail único e "o administrador não desativa a si mesmo".
- `locations` começa com os locais do Figma. A "Catraca Social" tem uma autorização ativa. Assim, você vê a recusa ao desativar este ponto.
- `authorizations` guarda tudo em memória com as regras da API: pessoa e local ativos, datas, horários, de 1 a 1000 usos e cancelamento idempotente. Ele usa as pessoas e os locais dos falsos `users` e `locations`. Ele já tem exemplos das quatro situações, também para `visitante@dev.local`.
- Os testes usam os falsos `currentPosition` e `clipboard`.

</details>

---

## Tema e componentes

As telas usam só o que está em `@/components/ui` e `@/theme`. Os valores vêm do [tokens.md](../docs/app-mobile/design/tokens.md) do Rafael.

<details>
<summary><b>Tema, escalas e componentes</b></summary>
<br>

- **Tema:** `colors` (os tokens em camelCase: `superficieAlta`, `primariaSobre`…), `typography` (estilos `pessoa*` e `admin*` do Figma), `spacing`, `radius` e `sizes`.
- **Fonte:** Atkinson Hyperlegible Next. A splash fica na tela até a fonte carregar.
- **Escalas:** a pessoa usa corpo 18 e botões de 60. O administrador usa corpo 16 e botões de 48. As telas do administrador envolvem o conteúdo em `<ThemeProvider scale="admin">`.
- **Componentes:** `Button`, `TextField`, `PasswordField`, `SelectField`, `DateField`, `TimeField`, `NumberStepper`, `SwitchField`, `FilterChip`, `StatusBadge`, `Card`, `ListItem`, `NavRow`, `ProgressBar`, `Alert`, `Dialog`, `useToast`, `LoadingState`, `EmptyState`, `ErrorState`, `OfflineBanner`, `ScreenContainer`, `Header` e `Fab`.
- **Formas e ícones:** formas em `@/components/shapes` e ícones em `@/components/Icon`.

</details>

<details>
<summary><b>Acessibilidade (fonte grande e leitor de tela)</b></summary>
<br>

- **Fonte grande:** a partir de 130% de fonte no sistema (`useLargeFont`), o que fica lado a lado vai para baixo.
- **Filtros:** para uma fila de filtros, use `ChipRow`. Com a fonte normal, ela rola para o lado. Com a fonte grande, ela quebra a linha.
- **Texto longo:** o `TextField` quebra a linha. O Enter continua a passar ao próximo campo.
- **Leitor de tela:** o `test/a11y.audit.spec.tsx` abre as telas pelas rotas. Ele reprova todo elemento de toque sem nome ou sem função. Coloque cada tela nova na lista deste teste.
- **Relatório da F14:** [docs/app-mobile/usabilidade](../docs/app-mobile/usabilidade/relatorio-F14.md).

</details>

<details>
<summary><b>Ferramentas de desenvolvimento</b></summary>
<br>

Em desenvolvimento, o rodapé do login tem **"Ferramentas de desenvolvimento"** (rota `/health`).

- A tela mostra se a API está no ar.
- Ela abre o **catálogo de componentes** (rota `/catalog`), com todos os componentes e estados nas duas escalas.
- Use o catálogo para revisar com o Rafael e para conferir a fonte do celular no máximo.

Em produção, as duas rotas voltam para o início.

</details>

---

## Testes e qualidade

```bash
npm test             # testes (Jest + Testing Library + MSW)
npm run test:watch   # testes em modo watch (ciclo TDD)
npm run test:cov     # testes com cobertura (pasta coverage/)
npm run lint         # ESLint, também as fronteiras de camada (View e Model)
npm run typecheck    # tsc --noEmit
npm run format       # Prettier (format:check só confere)
```

Antes de abrir um PR, rode `typecheck`, `lint`, `format:check` e `test`. Os quatro devem passar. Teste a tela num celular real.

<details>
<summary><b>Comandos do <code>package.json</code></b></summary>
<br>

| Comando                                   | O que faz                                             |
| ----------------------------------------- | ----------------------------------------------------- |
| `npm start`                               | inicia o Metro para abrir no Expo Go                  |
| `npm test` / `npm run test:watch`         | testes (Jest + Testing Library + MSW)                 |
| `npm run test:cov`                        | testes com cobertura (`coverage/`)                    |
| `npm run lint`                            | ESLint, também as fronteiras de camada (View e Model) |
| `npm run typecheck`                       | `tsc --noEmit`                                        |
| `npm run format` / `npm run format:check` | Prettier                                              |
| `npm run mock`                            | mock da API na porta 4010                             |

</details>

<details>
<summary><b>CI: o que roda em cada push e PR</b></summary>
<br>

O workflow [`.github/workflows/mobile-ci.yml`](../.github/workflows/mobile-ci.yml) ("Mobile CI", job `mobile-ci`) roda `lint`, `typecheck`, `format:check` e `test:cov`.

- Ele roda em todo push e PR que muda `mobile/**` ou `docs/app-mobile/**`. O teste do tema lê o `tokens.md`.
- Um PR que muda só o backend não inicia este workflow.

</details>

---

## Estrutura

Arquitetura do estudos_dpi: a página liga os serviços ao model e mostra a view. Detalhes e regras: [.claude/01-architecture.md](.claude/01-architecture.md).

```text
src/app/          rotas do Expo Router (arquivos de uma linha) e _layout.tsx
src/screens/      uma pasta por tela: page.tsx, <tela>.model.ts, <tela>.view.tsx, testes
src/components/   ui/ (componentes do Figma), shapes/ (formas do M3) e Icon.tsx
src/theme/        cores, tipografia, espaçamento, cantos, ThemeProvider e contraste
src/service/      AxiosInstance, ApiError, interfaces I*Service, implementations/, fakes/, container.ts
src/context/      SessionStore (zustand) e tokenStorage (expo-secure-store)
src/lib/          env.ts, tipos do contrato e funções puras
test/             servidor MSW, handlers com os exemplos do contrato e createWrapper
scripts/mock.mjs  mock do openapi.yaml no prefixo /api/v1
```

---

## Documentação

<div align="center">

| Documento                                                                       | Conteúdo                                             |
| :------------------------------------------------------------------------------ | :--------------------------------------------------- |
| [.claude/AGENTS.md](.claude/AGENTS.md)                                          | regras do app e mapa dos documentos                  |
| [.claude/00-onboarding.md](.claude/00-onboarding.md)                            | visão do projeto, pessoas, fluxo do QR e regras      |
| [.claude/ambiente-dev.md](.claude/ambiente-dev.md)                              | preparar o computador e abrir o app no celular       |
| [.claude/01-architecture.md](.claude/01-architecture.md)                        | camadas, pastas e como criar uma tela                |
| [.claude/02-tdd-workflow.md](.claude/02-tdd-workflow.md)                        | ciclo TDD e definição de pronto                      |
| [.claude/03-contract-for-the-app.md](.claude/03-contract-for-the-app.md)        | resumo do contrato da API para o app                 |
| [.claude/STATUS.md](.claude/STATUS.md)                                          | etapa atual, ordem das etapas e perguntas em aberto  |
| [docs/app-mobile/design/](../docs/app-mobile/design/README.md)                  | telas, decisões de design e tokens do Figma          |
| [docs/app-mobile/usabilidade/](../docs/app-mobile/usabilidade/relatorio-F14.md) | relatório de acessibilidade (F14) e roteiro de teste |
| [backend/README.md](../backend/README.md)                                       | API, homologação e contas de teste                   |

</div>

---

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0A7C66,100:17364F&height=120&section=footer" width="100%" />

<div align="center">

App mobile do **Passe** · equipe **DevFlow** · FATEC Jacareí · ABP 2026-2

</div>
