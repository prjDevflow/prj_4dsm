# App mobile (Passe)

App React Native do controle de acesso: a pessoa lê o QR Code da catraca e o administrador cuida dos
cadastros. Stack: Expo SDK 58 (Expo Go), Expo Router, TypeScript `strict`, TanStack Query, axios,
zustand, react-hook-form + zod, Jest + Testing Library + MSW.

Documentos do app (arquitetura, contrato, etapas, STATUS): [.claude/](.claude/). Comece pelo
[00-onboarding.md](.claude/00-onboarding.md) e pelo [AGENTS.md](.claude/AGENTS.md).

## Como rodar no celular (10 minutos)

1. Instale o **Node.js 22.18+** no computador e o **Expo Go** no celular (Play Store ou App Store).
   O celular e o computador precisam estar **na mesma rede Wi-Fi**.
2. Instale os pacotes:

   ```bash
   cd mobile
   npm ci
   ```

3. Crie o `.env` a partir do exemplo e troque o IP pelo do seu computador (`ipconfig` no Windows,
   `ip addr` no Linux/macOS). No celular, `localhost` é o próprio celular, por isso use o IP:

   ```bash
   cp .env.example .env
   # EXPO_PUBLIC_API_URL=http://192.168.0.15:3000/api/v1
   ```

4. Suba a API: o backend no Docker ([backend/docs/ambiente-dev.md](../backend/docs/ambiente-dev.md))
   ou o mock (abaixo).
5. Inicie o Expo e leia o QR Code do terminal com o Expo Go (Android) ou a câmera (iPhone):

   ```bash
   npm start
   ```

   Se a rede bloquear, use `npx expo start --tunnel`.

O app abre no **login** (T02). Com a API real e o seed do backend, use:

| Perfil        | E-mail                | Senha              | Cai em                  |
| ------------- | --------------------- | ------------------ | ----------------------- |
| Administrador | `admin@dev.local`     | `Admin-Dev-2026`   | início do administrador |
| Condômino     | `condomino@dev.local` | `Usuario-Dev-2026` | início da pessoa        |
| Visitante     | `visitante@dev.local` | `Usuario-Dev-2026` | início da pessoa        |

São as senhas públicas do `backend/.env.example`, só para desenvolvimento. Os inícios são provisórios
(saudação, perfil e "Sair") até a F04 trazer a T03 e a T14.

## Apontar para a API real ou para o mock

A URL da API vem só da variável `EXPO_PUBLIC_API_URL`, sempre terminando em `/api/v1`. Trocar de
destino é trocar a linha do `.env` e reiniciar o Expo com `npx expo start --clear`; nenhum código muda.

| Destino                    | `EXPO_PUBLIC_API_URL`            | Como subir                                                            |
| -------------------------- | -------------------------------- | --------------------------------------------------------------------- |
| API real no seu computador | `http://<IP>:3000/api/v1`        | `docker compose up -d` no `backend/` (migrate e seed na primeira vez) |
| Mock do `openapi.yaml`     | `http://<IP>:4010/api/v1`        | `npm run mock` em outro terminal                                      |
| Homologação (B10)          | URL HTTPS que o Eduardo publicar | —                                                                     |

O mock (`npm run mock`) é o Prism lendo o `../backend/openapi.yaml` e devolvendo os exemplos do
contrato, no mesmo prefixo `/api/v1` da API real. Ele só conhece as rotas que já estão no
`openapi.yaml` (hoje: health, auth e users).

Sem a variável, o app para com a mensagem "EXPO_PUBLIC_API_URL não definida". Variáveis `EXPO_PUBLIC_*`
vão dentro do app: nunca coloque segredos nelas.

## Serviços falsos

Para rotas que ainda não existem no backend, cada serviço tem uma versão falsa em
`src/service/fakes/`. Liste os nomes em `EXPO_PUBLIC_FAKE_SERVICES`, separados por vírgula (vazio =
todos reais):

```bash
EXPO_PUBLIC_FAKE_SERVICES=getHealth,loginUser
```

Os nomes aceitos são as chaves de `createServices` em [src/service/container.ts](src/service/container.ts).
Hoje: `getHealth` e `loginUser`. O login falso aceita os mesmos três usuários e senhas do seed.

## Tema e componentes

As telas só usam o que está em `@/components/ui` e `@/theme`, com os valores do
[tokens.md](../docs/app-mobile/design/tokens.md) do Rafael:

- **Tema:** `colors` (os tokens em camelCase: `superficieAlta`, `primariaSobre`…), `typography` (estilos
  `pessoa*` e `admin*` do Figma), `spacing`, `radius` e `sizes`. A fonte é a Atkinson Hyperlegible Next, e
  a splash só some quando ela carrega.
- **Escalas:** a pessoa usa corpo 18 e botões de 60; o administrador, corpo 16 e botões de 48. As telas do
  administrador envolvem o conteúdo em `<ThemeProvider scale="admin">`.
- **Componentes:** `Button`, `TextField`, `PasswordField`, `SelectField`, `DateField`, `TimeField`,
  `NumberStepper`, `SwitchField`, `FilterChip`, `StatusBadge`, `Card`, `ListItem`, `NavRow`, `ProgressBar`,
  `Alert`, `Dialog`, `useToast`, `LoadingState`, `EmptyState`, `ErrorState`, `OfflineBanner`,
  `ScreenContainer`, `Header` e `Fab`. Formas em `@/components/shapes` e ícones em `@/components/Icon`.

Em desenvolvimento, o rodapé do login tem **"Ferramentas de desenvolvimento"** (rota `/health`): mostra se
a API está no ar e leva ao **catálogo de componentes** (rota `/catalog`), com todos os componentes e estados
nas duas escalas. Use-o para revisar com o Rafael e para conferir a fonte do celular no máximo. Em produção,
as duas rotas voltam para o início.

## Comandos

| Comando                                   | Para quê                                                 |
| ----------------------------------------- | -------------------------------------------------------- |
| `npm start`                               | Inicia o Metro para abrir no Expo Go                     |
| `npm test` / `npm run test:watch`         | Testes (Jest + Testing Library + MSW)                    |
| `npm run test:cov`                        | Testes com cobertura (`coverage/`)                       |
| `npm run lint`                            | ESLint, incluindo as fronteiras de camada (View e Model) |
| `npm run typecheck`                       | `tsc --noEmit`                                           |
| `npm run format` / `npm run format:check` | Prettier                                                 |
| `npm run mock`                            | Mock da API na porta 4010                                |

O CI (`.github/workflows/ci.yml`, job `mobile`) roda `lint`, `typecheck`, `format:check` e `test:cov`
em todo push e PR que mexe em `mobile/**`.

## Estrutura

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

Detalhes e regras: [.claude/01-architecture.md](.claude/01-architecture.md).
