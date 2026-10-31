# 01 — Arquitetura do app (padrão do estudos_dpi)

Carregue este arquivo ao criar ou mover arquivos, criar uma tela, um serviço, um componente ou mexer na navegação. Testes: `02-tdd-workflow.md`. Contrato: `03-contract-for-the-app.md`.

Legenda: 📄 exigência do documento oficial do desafio · 💡 decisão ou sugestão do time (pode mudar) · ★ entrega que destrava outra pessoa · ❓ pergunta em aberto (lista no [STATUS.md](STATUS.md)) · 🔴 essencial · 🟡 importante · 🟢 pode ser cortada se faltar tempo.

---

## 1. A ideia: Page → Model → View → Service

O Eduardo pediu que o app siga a arquitetura do frontend do **estudos_dpi** (<https://github.com/EduMachado07/estudos_dpi>). Leia o README dele e os arquivos `src/app/login/` e `src/service/` antes de começar. A ideia central:

```text
Page → Model (hook) → Service → API
         │
         └──▶ View (só desenha)
```

| Camada | Arquivo | Responsabilidade | Pode importar |
|---|---|---|---|
| **Page** | `page.tsx` | Pega os serviços e liga o Model à View. Nada de lógica | Model, View, `service/container` |
| **Model** | `<tela>.model.ts` | Hook `use<Tela>Model`: estado, formulário, chamadas (TanStack Query), navegação e mensagens de erro | `service/I*Service` (só a interface), `context/`, `lib/` |
| **View** | `<tela>.view.tsx` | Recebe `ReturnType<typeof use<Tela>Model>` por props e desenha. Sem `useQuery`, sem axios, sem regra | `components/`, `theme/` |
| **Schema** | `<tela>.schema.ts` | Validação do formulário com Zod e o tipo inferido | `zod` |
| **Service** | `service/I*Service.ts` + `service/implementations/*Service.ts` | Uma classe por chamada à API, com método `exec`, implementando uma interface | `AxiosInstance`, `lib/types` |

Por que isso ajuda **neste** projeto:

1. **Testar sem API:** o Model recebe o serviço pela interface. No teste, você passa um serviço falso e testa todos os caminhos (sucesso, cada código de erro, sem rede) sem servidor.
2. **Trabalhar antes do backend:** as rotas B07 em diante ainda não existem. Você liga um serviço falso no `container` e a tela funciona no celular. Quando a rota sair, troca uma variável.
3. **View burra = fácil de revisar com o Figma:** a View só tem o que o Rafael desenhou.

## 2. O que muda do estudos_dpi para o app

O estudos_dpi é web (Vite, React Router, shadcn, cookies). O app troca as peças da plataforma e mantém as camadas:

| estudos_dpi (web) | App (React Native + Expo) | Por quê |
|---|---|---|
| `src/main.tsx` com `createBrowserRouter` e `QueryClientProvider` | `src/app/_layout.tsx` (Expo Router) com os providers | O Expo Router usa arquivos como rotas |
| `src/app/<feature>/page.tsx` | `src/app/<rota>.tsx` **só reexporta** a Page; a tela mora em `src/screens/<Area>/<tela>/` | No Expo Router, todo arquivo dentro de `src/app/` vira rota. Se o model e a view ficassem lá, virariam rotas também |
| `components/ProtectedRoute.tsx` | `Stack.Protected guard={...}` nos `_layout.tsx` | Mesmo papel, recurso nativo do Expo Router |
| `context/UserContext.ts` (zustand com `persist` no localStorage) | `context/SessionStore.ts` (zustand) + `context/tokenStorage.ts` (`expo-secure-store`) | 📄 RNF02: token só em armazenamento seguro |
| `AxiosInstance` com refresh token em cookie | `AxiosInstance` com `Authorization: Bearer` e tratamento de 401 que encerra a sessão | O contrato não tem refresh token (JWT de 12 h) |
| shadcn/ui em `components/ui/` | Componentes próprios em `components/ui/`, com os nomes do Figma | Mesmo princípio: as telas só importam de `components/ui` |
| `lucide-react` | Componente `Icon` próprio (❓ 4) | O Figma usa Material Symbols |
| `sonner` (toast) | `Toast` próprio em `components/ui` | — |
| `new Service()` dentro da Page a cada render | Instâncias criadas uma vez em `service/container.ts` | Evita recriar objetos e permite trocar real por falso |

Mantidos iguais: TypeScript `strict`, `react-hook-form` + `zod` + `@hookform/resolvers`, `@tanstack/react-query`, `axios`, `zustand`, alias `@/*`, nomes `use<Tela>Model`, `<Tela>View`, `<Tela>Page`, `I<Acao>Service`, classes com `exec`.

## 3. Estrutura de pastas

```text
mobile/
  app.json                      # nome, ícone, orientação retrato, permissões
  .env.example                  # EXPO_PUBLIC_API_URL, EXPO_PUBLIC_FAKE_SERVICES
  tsconfig.json                 # strict + paths "@/*": ["./src/*"]
  jest.config.js  jest.setup.ts
  eslint.config.js  .prettierrc
  AGENTS.md  CLAUDE.md          # regras para a IA
  docs/ambiente-dev.md          # instalar e rodar
  docs/ai/00 a 08               # documentos do app (um por responsabilidade)
  docs/ai/STATUS.md             # andamento do app (igual ao do backend)
  src/
    app/                        # SÓ rotas (arquivos de uma linha) e _layout.tsx
      _layout.tsx               # providers, fontes, T01 e os guards por sessão
      login.tsx                 # T02
      (app)/                    # qualquer pessoa logada
        _layout.tsx
        index.tsx               # T03 ou T14, conforme o perfil
        access/scanner.tsx      # T06, T07
        access/validate.tsx     # T08, T09
        access/result.tsx       # T10, T11
        me/authorizations/index.tsx   # T04
        me/authorizations/[id].tsx    # T05
        me/history.tsx          # T12
        me/account.tsx          # T13
        admin/                  # só ADMIN (guard no _layout.tsx)
          _layout.tsx
          users/index.tsx  users/new.tsx  users/[id].tsx            # T15, T16
          locations/...  terminals/...                              # T17 a T22
          authorizations/index.tsx  new.tsx  [id].tsx               # T23 a T25
          events/index.tsx  events/[id].tsx                         # T26, T27
          nfc-tags/index.tsx  new.tsx  [id].tsx  enroll.tsx         # T28 a T30
    screens/                    # = src/app do estudos_dpi: uma pasta por tela
      Auth/splash/   Auth/login/   Account/logout/
      User/home/   User/myAuthorizations/   User/myHistory/   User/account/
      Access/scanner/   Access/validate/   Access/result/
      Admin/home/   Admin/users/   Admin/locations/   Admin/terminals/
      Admin/authorizations/   Admin/events/   Admin/nfcTags/
    service/
      AxiosInstance.ts          # baseURL, timeout 10 s, Bearer, erros → ApiError, 401
      ApiError.ts
      IAuthService.ts  IUserService.ts  ILocationService.ts  ITerminalService.ts
      IAuthorizationService.ts  IAccessService.ts  INfcTagService.ts  IAccessEventService.ts
      implementations/          # LoginUserService.ts, GetMeService.ts, ...
      fakes/                    # FakeLoginUserService.ts, ... (testes e modo falso)
      container.ts              # escolhe real ou falso por serviço
    context/
      SessionStore.ts           # zustand: token, usuário, sessão expirada
      tokenStorage.ts           # expo-secure-store
    components/
      ui/                       # Button, TextField, StatusBadge, Dialog, Toast... (F02)
      shapes/                   # Cookie12, Clover4, Arch, Sun8, Circle (react-native-svg)
      Icon.tsx
    theme/                      # colors.ts, typography.ts, spacing.ts, index.ts (tokens.md)
    lib/
      types/                    # tipos do contrato: Usuario, Perfil, Autorizacao, ...
      env.ts                    # lê EXPO_PUBLIC_* uma vez
      qr.ts                     # isSystemQr(payload)
      denialReasons.ts          # código → texto, tom, ícone, botão (`03-contract-for-the-app.md`, seção 2)
      apiErrorMessages.ts       # erros genéricos → texto amigável
      formatters.ts             # datas e horas em São Paulo
      normalizeUid.ts           # UID da tag NFC
  test/
    factories/                  # makeUsuario, makeAutorizacao, ...
    renderWithProviders.tsx     # QueryClient novo por teste + tema
```

Nomes de pastas, arquivos, variáveis e funções em **inglês**. Textos da tela, nomes de testes, commits e PRs em **português**. Campos da API exatamente como no contrato.

## 4. Exemplo completo: a tela de login (T02)

Este é o molde. Toda tela do app segue os mesmos arquivos. O código abaixo é um ponto de partida; ajuste à versão das bibliotecas que o `npx expo install` trouxer.

**Tipos do contrato** (`src/lib/types/auth.ts`):

```ts
export type Perfil = "ADMIN" | "CONDOMINO" | "VISITANTE";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  usuario: Usuario;
}
```

**Interface do serviço** (`src/service/IAuthService.ts`):

```ts
import type { LoginResponse, Usuario } from "@/lib/types/auth";

export interface ILoginUserService {
  exec: (email: string, senha: string) => Promise<LoginResponse>;
}

export interface IGetMeService {
  exec: () => Promise<Usuario>;
}
```

**Erro do app** (`src/service/ApiError.ts`): toda falha de rede ou da API vira um `ApiError`, para o Model nunca lidar com axios.

```ts
export type FieldError = { field: string; message: string };

// code: a contract code (CREDENCIAIS_INVALIDAS, FORA_DO_PERIODO, ...) or an app-only code (NETWORK, TIMEOUT)
export class ApiError extends Error {
  constructor(
    readonly status: number | null,
    readonly code: string,
    message: string,
    readonly details: FieldError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}
```

**Cliente HTTP** (`src/service/AxiosInstance.ts`):

```ts
import axios, { AxiosError } from "axios";
import { env } from "@/lib/env";
import { useSessionStore } from "@/context/SessionStore";
import { ApiError, type FieldError } from "./ApiError";

type ErrorBody = { error?: { code?: string; message?: string; details?: FieldError[] } };

export const AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 10_000,
});

AxiosInstance.interceptors.request.use((config) => {
  const token = useSessionStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

AxiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorBody>) => {
    if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
      return Promise.reject(new ApiError(null, "TIMEOUT", "Tempo esgotado"));
    }
    if (!error.response) {
      return Promise.reject(new ApiError(null, "NETWORK", "Sem conexão"));
    }
    const { status, data } = error.response;
    // An expired or revoked token ends the session; the login screen shows the notice.
    if (status === 401 && useSessionStore.getState().token) {
      useSessionStore.getState().expireSession();
    }
    return Promise.reject(
      new ApiError(
        status,
        data?.error?.code ?? "INTERNAL_ERROR",
        data?.error?.message ?? "",
        data?.error?.details ?? [],
      ),
    );
  },
);
```

**Implementação** (`src/service/implementations/LoginUserService.ts`):

```ts
import type { LoginResponse } from "@/lib/types/auth";
import { AxiosInstance } from "../AxiosInstance";
import type { ILoginUserService } from "../IAuthService";

export class LoginUserService implements ILoginUserService {
  async exec(email: string, senha: string): Promise<LoginResponse> {
    const { data } = await AxiosInstance.post<LoginResponse>("/auth/login", { email, senha });
    return data;
  }
}
```

**Serviço falso** (`src/service/fakes/FakeLoginUserService.ts`): serve para os testes e para o modo falso no celular.

```ts
import type { LoginResponse } from "@/lib/types/auth";
import { ApiError } from "../ApiError";
import type { ILoginUserService } from "../IAuthService";
import { sampleLoginResponse } from "./sampleData";

export class FakeLoginUserService implements ILoginUserService {
  readonly calls: { email: string; senha: string }[] = [];

  constructor(private result: LoginResponse | ApiError = sampleLoginResponse) {}

  willFail(error: ApiError) {
    this.result = error;
  }

  async exec(email: string, senha: string): Promise<LoginResponse> {
    this.calls.push({ email, senha });
    if (this.result instanceof ApiError) throw this.result;
    return this.result;
  }
}
```

**Sessão** (`src/context/SessionStore.ts` e `tokenStorage.ts`):

```ts
// tokenStorage.ts
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "session.accessToken";

export const tokenStorage = {
  load: () => SecureStore.getItemAsync(TOKEN_KEY),
  save: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};
```

```ts
// SessionStore.ts
import { create } from "zustand";
import type { Usuario } from "@/lib/types/auth";
import { tokenStorage } from "./tokenStorage";

type SessionStore = {
  token: string | null;
  usuario: Usuario | null;
  expired: boolean;
  signIn: (token: string, usuario: Usuario) => Promise<void>;
  setUsuario: (usuario: Usuario) => void;
  signOut: () => Promise<void>;
  expireSession: () => void;
};

export const useSessionStore = create<SessionStore>()((set) => ({
  token: null,
  usuario: null,
  expired: false,
  signIn: async (token, usuario) => {
    await tokenStorage.save(token);
    set({ token, usuario, expired: false });
  },
  setUsuario: (usuario) => set({ usuario }),
  signOut: async () => {
    await tokenStorage.clear();
    set({ token: null, usuario: null, expired: false });
  },
  expireSession: () => {
    void tokenStorage.clear();
    set({ token: null, usuario: null, expired: true });
  },
}));
```

**Schema** (`src/screens/Auth/login/login.schema.ts`):

```ts
import { z } from "zod";

export const SchemaLoginUser = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Informe seu e-mail." })
    .max(254, { message: "Digite um e-mail válido. Exemplo: nome@email.com" })
    .email({ message: "Digite um e-mail válido. Exemplo: nome@email.com" }),
  senha: z.string().min(1, { message: "Informe sua senha." }).max(72),
});

export type SchemaLoginUserType = z.infer<typeof SchemaLoginUser>;
```

**Mensagens de erro do envio** (`src/screens/Auth/login/login.messages.ts`):

```ts
import type { ApiError } from "@/service/ApiError";

export const loginErrorMessage = (error: ApiError): string => {
  switch (error.code) {
    case "CREDENCIAIS_INVALIDAS":
      return "E-mail ou senha incorretos. Confira e tente de novo.";
    case "USUARIO_INATIVO":
      return "Seu cadastro está inativo. Procure a administração.";
    case "RATE_LIMITED":
      return "Muitas tentativas. Aguarde um minuto e tente de novo.";
    case "NETWORK":
    case "TIMEOUT":
      return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
    default:
      return "Não foi possível entrar agora. Tente novamente em instantes.";
  }
};
```

**Model** (`src/screens/Auth/login/login.model.ts`):

```ts
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import type { ILoginUserService } from "@/service/IAuthService";
import type { ApiError } from "@/service/ApiError";
import type { LoginResponse } from "@/lib/types/auth";
import { useSessionStore } from "@/context/SessionStore";
import { SchemaLoginUser, type SchemaLoginUserType } from "./login.schema";
import { loginErrorMessage } from "./login.messages";

type LoginModelProps = {
  loginUserService: ILoginUserService;
};

export const useLoginModel = ({ loginUserService }: LoginModelProps) => {
  const form = useForm<SchemaLoginUserType>({
    resolver: zodResolver(SchemaLoginUser),
    defaultValues: { email: "", senha: "" },
  });
  const [apiError, setApiError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const signIn = useSessionStore((state) => state.signIn);
  const sessionExpired = useSessionStore((state) => state.expired);

  const { mutate, status } = useMutation<LoginResponse, ApiError, SchemaLoginUserType>({
    mutationFn: ({ email, senha }) => loginUserService.exec(email.toLowerCase(), senha),
    onError: (error) => {
      setApiError(loginErrorMessage(error));
      form.resetField("senha");
      form.setFocus("senha");
    },
    onSuccess: async ({ accessToken, usuario }) => {
      setApiError(null);
      // The guards in app/_layout.tsx react to the session and open the right home.
      await signIn(accessToken, usuario);
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });

  const onSubmit = (data: SchemaLoginUserType) => {
    if (inFlight.current) return; // double tap sends a single request
    inFlight.current = true;
    setApiError(null);
    mutate(data);
  };

  return {
    form,
    onSubmit,
    apiError,
    sessionExpired,
    isSubmitting: status === "pending",
  };
};
```

**View** (`src/screens/Auth/login/login.view.tsx`):

```tsx
import { Controller } from "react-hook-form";
import { Alert, Button, PasswordField, ScreenContainer, Text, TextField } from "@/components/ui";
import type { useLoginModel } from "./login.model";

type LoginViewProps = ReturnType<typeof useLoginModel>;

export const LoginView = ({ form, onSubmit, apiError, sessionExpired, isSubmitting }: LoginViewProps) => (
  <ScreenContainer>
    <Text variant="pessoaTitulo" accessibilityRole="header">
      Controle de Acesso
    </Text>
    <Text variant="pessoaCorpo">Entre com sua conta</Text>

    {sessionExpired && <Alert tone="aviso" message="Sua sessão expirou. Entre novamente." />}

    <Controller
      control={form.control}
      name="email"
      render={({ field, fieldState }) => (
        <TextField
          ref={field.ref}
          label="E-mail"
          placeholder="nome@email.com"
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => form.setFocus("senha")}
          editable={!isSubmitting}
        />
      )}
    />

    <Controller
      control={form.control}
      name="senha"
      render={({ field, fieldState }) => (
        <PasswordField
          ref={field.ref}
          label="Senha"
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          returnKeyType="go"
          onSubmitEditing={form.handleSubmit(onSubmit)}
          editable={!isSubmitting}
        />
      )}
    />

    {apiError && <Alert tone="erro" message={apiError} />}

    <Button
      label="Entrar"
      loadingLabel="Entrando…"
      loading={isSubmitting}
      onPress={form.handleSubmit(onSubmit)}
    />
    <Text variant="pessoaApoio">Problemas para entrar? Procure a administração.</Text>
  </ScreenContainer>
);
```

**Page** (`src/screens/Auth/login/page.tsx`) e **rota** (`src/app/login.tsx`):

```tsx
// page.tsx
import { services } from "@/service/container";
import { useLoginModel } from "./login.model";
import { LoginView } from "./login.view";

export const LoginPage = () => {
  const methods = useLoginModel({ loginUserService: services.loginUser });
  return <LoginView {...methods} />;
};
```

```tsx
// src/app/login.tsx
export { LoginPage as default } from "@/screens/Auth/login/page";
```

**Layout raiz com os guards** (`src/app/_layout.tsx`, esboço): faz o papel do `main.tsx` e do `ProtectedRoute` do estudos_dpi.

```tsx
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSessionStore } from "@/context/SessionStore";
import { ThemeProvider } from "@/theme";
import { SplashPage } from "@/screens/Auth/splash/page";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 }, mutations: { retry: 0 } },
});

export default function RootLayout() {
  const usuario = useSessionStore((state) => state.usuario);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {/* T01: restores the saved session (token + GET /auth/me) before showing any route */}
        <SplashPage>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!usuario}>
              <Stack.Screen name="login" />
            </Stack.Protected>
            <Stack.Protected guard={!!usuario}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
          </Stack>
        </SplashPage>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

E em `src/app/(app)/admin/_layout.tsx`, outro `Stack.Protected guard={usuario?.perfil === "ADMIN"}`. Confira na documentação do Expo Router da sua versão como o `Stack.Protected` funciona; se a sua versão não tiver, use `<Redirect href="/login" />` no `_layout`, que é o mesmo papel do `ProtectedRoute`.

## 5. Regras que valem para todo o código

1. **View não chama API** e não tem `useQuery`/`useMutation`. Tudo isso fica no Model.
2. **Model não importa axios nem a implementação do serviço**: só a interface `I*Service`.
3. **Nenhum código técnico na tela.** Todo `ApiError` passa por uma função de mensagem (`login.messages.ts`, `lib/apiErrorMessages.ts`, `lib/denialReasons.ts`).
4. **Negação de acesso é resultado, não erro de tela:** o Model da validação transforma o 403 com código de motivo num valor `{ resultado: "NEGADO", motivo }` e a tela de resultado desenha.
5. **A validação do QR nunca se repete sozinha** (`retry: 0` na mutação, sem *retry* no axios).
6. **Token só no `expo-secure-store`**; nada de token, senha ou chave do terminal em `console.log`.
7. **Datas:** a API manda UTC; formate em São Paulo só na hora de mostrar (`lib/formatters.ts`).
8. **Textos exatos do Figma e do contrato.** Mudou um texto? Combine com o Rafael (visual) ou com o Eduardo (contrato).

## 6. Serviços falsos e o `container`

O `container` decide, serviço por serviço, se usa o real ou o falso. A lista de falsos vem do `.env`:

```bash
# mobile/.env
EXPO_PUBLIC_API_URL=http://192.168.0.15:3000/api/v1
# serviços falsos enquanto a rota não existe (separados por vírgula; vazio = tudo real)
EXPO_PUBLIC_FAKE_SERVICES=validateQr,listMyAuthorizations
```

```ts
// src/service/container.ts (trecho)
import { env } from "@/lib/env";
import { LoginUserService } from "./implementations/LoginUserService";
import { FakeLoginUserService } from "./fakes/FakeLoginUserService";
import { ValidateQrService } from "./implementations/ValidateQrService";
import { FakeValidateQrService } from "./fakes/FakeValidateQrService";

const useFake = (name: string) => env.fakeServices.includes(name);

export const services = {
  loginUser: useFake("loginUser") ? new FakeLoginUserService() : new LoginUserService(),
  validateQr: useFake("validateQr") ? new FakeValidateQrService() : new ValidateQrService(),
  // ...um item por serviço
};
```

💡 Os falsos usados no celular devolvem dados plausíveis (os do seed) e, no caso da validação do QR, permitem escolher o motivo da resposta por um menu de desenvolvimento (só em `__DEV__`), para você mostrar e testar as 10 telas de negação sem backend. Os formatos dos dados falsos vêm do contrato e dos guias do backend; **quando a rota real sair, confira o formato no Swagger e corrija o falso se divergir**.

💡 Para as rotas que já estão no `openapi.yaml` (health, auth, users), você também pode subir um mock pelo próprio arquivo: `npx @stoplight/prism-cli mock ../backend/openapi.yaml -h 0.0.0.0 -p 4010` (script `npm run mock`). É opcional: com o backend em Docker você já tem a API de verdade.

---
