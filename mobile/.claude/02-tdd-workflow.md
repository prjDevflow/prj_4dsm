# 02 — Testes, fluxo TDD e Definição de pronto comum

Carregue este arquivo ao escrever qualquer teste, ao começar uma etapa e ao conferir se ela está pronta.

Legenda: 📄 exigência do documento oficial do desafio · 💡 decisão ou sugestão do time (pode mudar) · ★ entrega que destrava outra pessoa · ❓ pergunta em aberto (lista no [STATUS.md](STATUS.md)) · 🔴 essencial · 🟡 importante · 🟢 pode ser cortada se faltar tempo.

---

## 1. O ciclo TDD no app

1. Vire cada item da **Lista de testes** da etapa num `it.todo("...")` (nome em português).
2. Escreva o teste e veja falhar (**red**). Commit `test(Fxx): ... (red)`.
3. Escreva o mínimo de código para passar (**green**). Commit `feat(Fxx): ... (green)` ou `fix(Fxx): ... (green)`.
4. Refatore com os testes verdes. Commit `refactor(Fxx): ...`.
5. Repita até a lista acabar. Depois, teste no celular e junte a evidência (print, GIF ou vídeo).

Ordem sugerida dentro de uma tela: `lib/` e schema → serviço (MSW) → model (serviço falso) → view/tela.

Regras de commit e PR: `08-commits-and-prs.md`.

## 2. Como testar cada camada

| Camada | Ferramenta | O que testar |
|---|---|---|
| `lib/` (funções puras) | Jest | `isSystemQr`, `normalizeUid`, `formatters`, `denialReasons`, `apiErrorMessages` |
| Schema | Jest | Cada mensagem de erro de campo, limites (1 e 1000, 3 e 120 caracteres…) |
| Model | `renderHook` do Testing Library + serviço falso | Sucesso, cada erro da API, sem rede, duplo toque, navegação/estado da sessão |
| View / tela | `render` + `fireEvent`/`userEvent` do Testing Library | Textos, estados (carregando, vazio, erro), rótulos de acessibilidade |
| Service | Jest + MSW (`msw/node`) | URL, método, corpo e conversão do erro da API em `ApiError` |

Exemplo de teste do Model (`src/screens/Auth/login/login.model.spec.ts`):

```ts
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { ApiError } from "@/service/ApiError";
import { FakeLoginUserService } from "@/service/fakes/FakeLoginUserService";
import { useSessionStore } from "@/context/SessionStore";
import { createWrapper } from "@test/renderWithProviders";
import { useLoginModel } from "./login.model";

describe("useLoginModel", () => {
  beforeEach(() => useSessionStore.setState({ token: null, usuario: null, expired: false }));

  it("não chama a API quando os campos estão vazios", async () => {
    const service = new FakeLoginUserService();
    const { result } = renderHook(() => useLoginModel({ loginUserService: service }), {
      wrapper: createWrapper(),
    });

    await act(() => result.current.form.handleSubmit(result.current.onSubmit)());

    expect(service.calls).toHaveLength(0);
    expect(result.current.form.formState.errors.email?.message).toBe("Informe seu e-mail.");
  });

  it("envia o e-mail em minúsculas e abre a sessão quando as credenciais estão certas", async () => {
    const service = new FakeLoginUserService();
    const { result } = renderHook(() => useLoginModel({ loginUserService: service }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.form.setValue("email", "Admin@Dev.Local");
      result.current.form.setValue("senha", "Admin-Dev-2026");
    });
    await act(() => result.current.form.handleSubmit(result.current.onSubmit)());

    await waitFor(() => expect(useSessionStore.getState().usuario?.perfil).toBe("ADMIN"));
    expect(service.calls[0]).toEqual({ email: "admin@dev.local", senha: "Admin-Dev-2026" });
  });

  it("mostra a mensagem de credenciais inválidas e limpa a senha", async () => {
    const service = new FakeLoginUserService();
    service.willFail(new ApiError(401, "CREDENCIAIS_INVALIDAS", "E-mail ou senha inválidos"));
    const { result } = renderHook(() => useLoginModel({ loginUserService: service }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.form.setValue("email", "admin@dev.local");
      result.current.form.setValue("senha", "errada");
    });
    await act(() => result.current.form.handleSubmit(result.current.onSubmit)());

    await waitFor(() =>
      expect(result.current.apiError).toBe("E-mail ou senha incorretos. Confira e tente de novo."),
    );
    expect(result.current.form.getValues("senha")).toBe("");
  });
});
```

`createWrapper()` cria um `QueryClient` **novo por teste** (com `retry: false`) e envolve o hook no `QueryClientProvider`. O alias `@test/*` aponta para `mobile/test/` (configure no `tsconfig.json` e no `moduleNameMapper` do Jest).

## 3. Definição de pronto comum (vale para toda etapa F)

- [ ] Testes escritos **antes** do código e passando no CI (`npm test`); cobertura não caiu.
- [ ] `npm run lint`, `npm run typecheck` e `npm run format:check` sem erros; nenhum aviso no console do Metro.
- [ ] Tela igual ao Figma (cores, tamanhos e textos de `tokens.md`), com os **textos exatos**.
- [ ] Toda tela que usa a rede trata **carregando, vazio, erro (com "Tentar novamente"), sem internet e tempo esgotado** (T31).
- [ ] Acessibilidade mínima: `accessibilityRole` e `accessibilityLabel` em todo elemento interativo, toque de 48 × 48 no mínimo, cor nunca é a única pista, texto não corta com a fonte do sistema maior.
- [ ] Nenhum código técnico na tela; nenhum token, senha ou chave em log.
- [ ] Testado **no seu celular** pelo Expo Go, contra a API real quando a rota existe (senão, contra o falso, e anotado no PR).
- [ ] Camadas respeitadas (`01-architecture.md`, seção 5): View sem API, Model só com interfaces.
- [ ] `STATUS.md` do app atualizado; PR revisado e integrado em `develop`.

---
