# AGENTS.md — Mobile app context for AI assistants (ABP 2026-2 Access Control)

This file is the entry point. Read it fully, then load only the files the current task needs (see "File map").

## 1. Project in one paragraph

Mobile app of an integrated access-control system (IoT terminal + mobile app + API). Stack: React Native, Expo (run with **Expo Go**, no development build), Expo Router, TypeScript (`strict`), TanStack Query, axios, zustand, react-hook-form + zod, Jest + jest-expo + Testing Library + MSW. The app serves two audiences: the person who passes the turnstile (CONDOMINO, VISITANTE, also ADMIN) reads the terminal's QR code, sends it with the phone position to the API and shows the decision; the administrator manages users, locations, terminals, authorizations, NFC tags and history. The app never talks to the terminal; everything goes through the API.

Owner of this part: Pedro (mobile). Backend: Eduardo. Terminal firmware: Matheus. Design (Figma "Passe", screens T01–T31): Rafael. The API contract is shared; never change it silently.

## 2. Non-negotiable rules

1. **Test first (TDD).** Write the failing test before the code that makes it pass. Order inside a screen: `lib/` and schema → service (MSW) → model (fake service) → view. Details: `docs/ai/02-tdd-workflow.md`.
2. **Layers of the estudos_dpi architecture.** `page.tsx` wires services to the model and renders the view; `<screen>.model.ts` (hook `use<Screen>Model`) holds state, forms, queries, mutations and error messages; `<screen>.view.tsx` only renders the props it receives; services are classes with `exec` behind `I*Service` interfaces. Views never call the API or use `useQuery`/`useMutation`; models import only service interfaces, never axios or implementations. Files in `src/app/` are thin Expo Router routes that re-export a page from `src/screens/`. Details: `docs/ai/01-architecture.md`.
3. **The contract is law.** Routes, field names (Portuguese: `senha`, `usuarioId`, `situacaoEfetiva`), error shape and reason codes come from `../backend/docs/ai/03-domain-and-contract.md` and `../backend/openapi.yaml`. Summary for the app: `docs/ai/03-contract-for-the-app.md`. If a screen seems to need a contract change, stop and ask.
4. **No technical code on screen.** Every `ApiError` goes through a message function; denial texts are the contract's `message`, word for word (`src/lib/denialReasons.ts`).
5. **An access denial is a result, not a screen error.** The validation model turns a 403 with a reason code into `{ tipo: "NEGADO", motivo }`. Decide by `error.code`, never by status alone (403 is also `FORBIDDEN`).
6. **Access validation is never retried automatically** (`retry: 0`, no axios retry). The person reads the QR again.
7. **Security.** Token only in `expo-secure-store`. Never log tokens, passwords or terminal keys. The terminal key (T22) is shown once and not cached.
8. **Dates.** The API sends UTC instants and `YYYY-MM-DD` / `HH:mm`; display `dd/MM/aaaa` and `HH:mm` in `America/Sao_Paulo`, formatting only at display time.
9. **Accessibility (RNF04, elderly users).** `accessibilityRole` and `accessibilityLabel` on every interactive element, 48 × 48 minimum touch target, color never the only cue, text survives large system font.
10. **Expo Go only.** Install native packages with `npx expo install`. Do not add a library that requires a development build or `expo prebuild`.
11. **One step ID per branch and PR.** Branch, commit and PR rules: `docs/ai/08-commits-and-prs.md`.
12. **Stay in scope. Do not invent requirements.** Implement only the current step. Ambiguities go to the open questions in `docs/ai/STATUS.md`.

## 3. File map (load on demand)

| File | Load when |
|---|---|
| `docs/ai/00-onboarding.md` | Understanding the project, people, QR flow, business rules (Portuguese, for the human) |
| `docs/ambiente-dev.md` | Setting up the machine, running the backend, opening the app on the phone |
| `docs/ai/01-architecture.md` | Creating or moving files, adding a screen, service, component or route |
| `docs/ai/02-tdd-workflow.md` | Writing any test; starting any step; checking the Definition of Done |
| `docs/ai/03-contract-for-the-app.md` | Any service, contract type, error message or the result screen |
| `docs/ai/04-steps-F01-F04.md` | Setup, theme and components, login, navigation and session |
| `docs/ai/05-steps-F09-F11.md` | QR scanner, access validation and result, my authorizations |
| `docs/ai/06-steps-F05-F08.md` | Users, locations and terminals, authorizations (admin) |
| `docs/ai/07-steps-F12-F15.md` | NFC tags, history, accessibility audit, build and manual |
| `docs/ai/08-commits-and-prs.md` | Creating a branch, committing, pushing, opening a PR |
| `docs/ai/STATUS.md` | Start of every session (current step, order, deadlines, open questions); end of session: update it |
| `../docs/app-mobile/design/README.md`, `tokens.md` | Any visual work: colors, typography, shapes, icons, texts, screen links |

Do not load all step files at once. Load the one that contains the current step.

## 4. How to start a task

1. Open `docs/ai/STATUS.md` and identify the current step (for example F03) and its backend dependency.
2. Open the step file. Confirm the app dependencies are done; if the backend route is not ready, plan to use the fake service (`EXPO_PUBLIC_FAKE_SERVICES`).
3. Read the step's "Lista de testes", "Critérios de aceitação" and "Definição de pronto", and open its screens in Figma.
4. Propose the plan in about 5 lines (files, services, first test) and wait for approval. Then follow the TDD loop.
5. When finished, run the checks below, tick the criteria, update `STATUS.md` and follow `08-commits-and-prs.md`.

## 5. Commands (from `mobile/`)

| Command | Purpose |
|---|---|
| `npx expo start` (`npm start`) | Start Metro; open with Expo Go (`--tunnel` if the network blocks) |
| `npm test` / `npm run test:watch` | Jest (unit and screen tests) |
| `npm run test:cov` | Coverage |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run mock` (optional) | Prism mock of `../backend/openapi.yaml` on port 4010 |

Before saying a step is done, `typecheck`, `lint`, `format:check` and `test` must pass, and the screen must have been tried on a real phone.

## 6. Conventions at a glance

| Topic | Rule |
|---|---|
| Identifiers, files, folders | English (`useLoginModel`, `LoginView`, `ValidateQrService`, `screens/Access/scanner/`) |
| API fields, reason codes | Portuguese, exactly as in the contract |
| Screen texts, test names, commits, PRs | Portuguese (`it("mostra a mensagem de credenciais inválidas e limpa a senha")`) |
| Screen folder | `src/screens/<Area>/<screen>/` with `page.tsx`, `<screen>.model.ts`, `<screen>.view.tsx`, `<screen>.schema.ts`, `<screen>.messages.ts`, `*.spec.ts(x)` |
| Services | `src/service/I<Area>Service.ts` (interfaces), `implementations/<Action>Service.ts`, `fakes/Fake<Action>Service.ts`, wired in `container.ts` |
| Aliases | `@/*` → `src/*`, `@test/*` → `test/*` |

## 7. Ask before you

- change anything in the contract (route, field, code, status, message);
- add a library, change `tsconfig`, ESLint, Prettier or Jest config, or the CI workflow;
- implement a design item marked "Ideia" in `../docs/app-mobile/design/README.md`;
- skip a failing test, loosen an assertion or lower coverage to get green.

## 8. Language policy

Instruction files for AI (this file and `08-commits-and-prs.md`) are in English. The other files in `docs/ai/` are in Portuguese because their main reader is Pedro and they derive from the course documents. Code comments: English, short, only where the reason is not obvious.
