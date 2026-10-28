# 08 — Branches, commits and pull requests (instructions for AI assistants)

Load this file before creating a branch, committing, pushing or opening a pull request in `mobile/`. It describes the convention Eduardo already uses in the repository (see `git log origin/develop` and `backend/.claude/commands/close-step.md`); follow it exactly. Everything the reader sees (commit messages, PR title and body) is written in **Portuguese (pt-BR)**. Identifiers in code stay in English.

## 1. Branches

| Kind of work | Branch name | Created from | Examples in the repo |
|---|---|---|---|
| A step (F01–F15) | `feature/<ID>-<short-kebab-case-description-in-english>` | up-to-date `develop` | `feature/B05-authentication`, `feature/B06-users` → for the app: `feature/F01-setup`, `feature/F03-login`, `feature/F11-qr-validation` |
| Documentation not tied to one step | `docs/<topic>` | `develop` | `docs/readme`, `docs/design-app-mobile` |
| Stacked step (the previous step's PR is still open) | same `feature/<ID>-…` pattern | the previous step's branch | `feature/B06-users` was created from `feature/B05-authentication` |

Rules:

- **One step ID per branch.** Never mix F03 and F04 work in one branch. Work outside the step goes to another branch.
- Never commit to `develop` or `main` directly; both are protected by the ruleset and require a PR with green CI.
- Before creating the branch: `git fetch origin develop` and start from `origin/develop`. Report uncommitted changes instead of carrying them over.

## 2. Commit messages

Format (Conventional Commits with the step ID as scope):

```
<type>(<ID>): <descrição em português, no presente, 3ª pessoa, minúscula, sem ponto final>[ (red|green)]

[corpo opcional: o porquê, em português, linhas de até ~72 caracteres]

[linhas de atribuição que o ambiente configurar]
```

| Type | When | Real examples from the history |
|---|---|---|
| `test` | A failing test written **before** the code. Add ` (red)` at the end | `test(B06): CreateUser rejeita e-mail repetido e ignora espaços (red)` |
| `feat` | Code that makes the red test pass with new behavior. Add ` (green)` | `feat(B06): CreateUser recusa e-mail repetido e normaliza o e-mail (green)` |
| `fix` | Code that makes a red test pass by correcting existing behavior. Add ` (green)` | `fix(B05): JwtTokenProvider exige exp no token (green)` |
| `refactor` | Structure change with all tests green; no suffix | `refactor(B06): extrai a proteção do administrador do UpdateUser` |
| `test` without suffix | A test that is green at once (it covers existing code), or a test-only fix | `test(B05): confere o Retry-After do 429 de login`, `test(B05): corrige lint do spec de parseEnv` |
| `docs` | README, STATUS, openapi, step files | `docs(B06): marca critérios e DoD da B06 e atualiza o STATUS`, `docs(B05): registra o PR #7 no STATUS` |
| `docs` without scope | Documentation that belongs to no step | `docs: adiciona README geral do projeto` |
| `chore`, `ci`, `build` | Tooling, CI workflow, dependencies (ask first, see section 6) | `ci(F01): adiciona o job mobile ao workflow de CI` |

Writing the description:

- Start with a verb in the present tense, third person: "adiciona", "rejeita", "mostra", "corrige", "extrai", "registra". Not "adicionar", not "added".
- Name the thing that changed and the behavior, in the user's or domain's words: `test(F03): login mostra a mensagem de credenciais inválidas e limpa a senha (red)`, `feat(F10): leitor ignora QR que não é da catraca (green)`.
- Keep the subject line short (aim for 72 characters, never more than about 100). Details go in the body.
- Code identifiers keep their English names inside the Portuguese sentence (`useLoginModel`, `ValidateQrService`).

Granularity (this is what makes the TDD history readable):

- One red commit and one green commit per test list item, or per small group of related items. Then an optional refactor commit.
- Commit only files of the step, staging them explicitly (`git add <paths>`). Never stage `.env`, `node_modules/`, build output, keystores, screenshots of credentials or anything with secrets.
- At the end of a step: one `docs(<ID>): ...` commit that ticks criteria and DoD in the step file and updates `STATUS.md`.

## 3. Checks before pushing

From `mobile/`, all must pass: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run test:cov` (coverage must not drop). If something fails, fix it test-first (a red commit that reproduces the problem, then the green fix) and run everything again. Never skip, disable, `.only`, or loosen a test to get green (RP10 is eliminatory for the project).

## 4. Pull request

- **Base:** `develop` (for a stacked branch, the previous step's branch; the first line of the body then says it depends on that PR and must be merged after it).
- **Title:** `[<ID>] <nome da etapa em português>`, exactly the step name from the step file: `[F01] Setup do app`, `[F03] Login`, `[F11] Validação do acesso e resultado`. When a stacked step is later integrated into `develop` by its own PR, the repo uses `[B06] Usuários (integra a B06 ao develop)`. Documentation PRs use the commit style: `docs: adiciona os documentos do app mobile`.
- **Do not squash or rewrite commits.** The PR must show every small red/green commit. Remind Eduardo to merge with a merge commit (or rebase), not squash.
- **Reviewer:** Eduardo (he checks the use of the contract). If the PR touches the contract or the terminal behavior, also Matheus.
- **Evidence:** screenshots, a GIF or a short video from the phone (Expo Go) for every screen the step touches.
- If `gh` or the GitHub tools are not available or not authorized, print the title, the body and the compare URL so Eduardo can open the PR manually. Keep the attribution lines the environment configures.

Body (Portuguese, fill every section; same structure as the backend's `close-step`):

```
## Resumo
2 a 4 frases: o que a etapa entrega, requisitos atendidos (RFxx, RNFxx), telas (Txx) e o que ela destrava.

## O que foi feito
- telas, models, serviços, componentes, rotas do Expo Router, variáveis de ambiente

## Como rodar
1. git checkout <branch>
2. cd mobile && npm ci
3. cp .env.example .env (EXPO_PUBLIC_API_URL com o IP do computador; serviços falsos ligados: ...)
4. backend: docker compose up -d, migrate e seed (backend/docs/ambiente-dev.md)
5. npx expo start e abrir no Expo Go

## Como testar
- Automatizados: npm test; total de testes novos
- Manual no celular: passos curtos com o usuário do seed e o resultado esperado

## Evidências
prints, GIF ou vídeo do celular

## Critérios de aceitação
- [x] ... (um item por critério da etapa)

## Definição de pronto
- [x] ... (itens do DoD comum e da etapa; pendentes ficam [ ] com o motivo)

## Commits
lista completa de git log <BASE>..HEAD --oneline

## Contrato e impacto
Usa alguma rota com serviço falso? Encontrou divergência com o contrato? Quem precisa ser avisado (Eduardo, Matheus, Rafael) e o quê.

## Pendências e observações
Itens manuais, decisões tomadas, riscos, perguntas em aberto (❓ do STATUS.md).
```

## 5. After the PR

- Set the step to 🟨 in `STATUS.md` with the PR link (Eduardo marks ✅ after the merge), add a row to "Registro de sessões" and any decision to the ADR list.
- Move the step's card in Trello to "Em revisão".
- Final message to the person: the PR link, the result of each check, what is still pending on their side (manual tests, who reviews, who to notify).

## 6. Ask before you

- add a dependency that is not listed in `04-steps-F01-F04.md` (F01);
- change `tsconfig.json`, ESLint or Prettier rules, `jest.config.js`, or `.github/workflows/ci.yml`;
- change anything that looks like the API contract (route, field, status, reason code, message);
- force-push, rebase a shared branch, or push to a branch other than the step's branch.
