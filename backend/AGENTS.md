# AGENTS.md — Backend context for AI assistants (ABP 2026-2 Access Control)

This file is the entry point. Read it fully, then load only the files the current task needs (see "File map").

## 1. Project in one paragraph

Backend of an integrated access-control system (IoT terminal + mobile app + API). Stack: Node.js, Express 5, TypeScript (`strict`), Prisma, PostgreSQL, Docker, GitHub Actions. The API serves two clients: the mobile app (JWT) and the access terminal (ESP32 or virtual simulator, authenticated by terminal key). The backend generates a QR code per terminal every 10 s, validates access requests (QR from the app, NFC UID from the terminal), consumes authorization uses atomically, records one event per attempt and tells the terminal to open or deny.

Owner of this part: Eduardo (backend). Frontend: Lucas. IoT: Pedro. The API contract is shared; never change it silently.

## 2. Non-negotiable rules

1. **Test first (TDD).** Write the failing test before the code that makes it pass. Order for each use case: test list → spec (red) → use case (green) → refactor → controller, route and repository (driven by an integration test). Details: `docs/ai/02-tdd-workflow.md`.
2. **Dependency rule.** `entities` know nothing. `useCases` depend on `entities`, `repositories` (ports) and `providers` (ports) only. `infra` implements the ports. Nothing in `entities` or `useCases` imports `express`, `@prisma/client`, `bcrypt`, `jsonwebtoken`, `process.env` or `Date.now()`.
3. **Expected business denials are values, not exceptions.** Access validation returns a decision (`granted` or `denied` with a reason code). Exceptions (`AppError`) are for HTTP-level problems: validation, auth, not found, conflict.
4. **Time is injected.** Use `IClock`. TTL of QR codes, authorization windows and command expiry must be testable with a fake clock.
5. **The contract is law.** Routes, field names, error shape and reason codes are in `docs/ai/03-domain-and-contract.md`. If a task seems to need a contract change, stop and ask.
6. **Atomicity.** Approving an access (consume QR credential, consume one use, insert event, insert command) happens in one database transaction. Concurrency is proven only by integration tests against real PostgreSQL.
7. **Exactly one event per access attempt**, approved or denied. Approval never happens without its event.
8. **Security.** Never store or log passwords, tokens or terminal keys in clear text. Store hashes. No secrets in the repository. Errors never expose stack traces in production.
9. **No `any` without a justification comment.** No `console.log` in `src` (use `ILogger`).
10. **One step ID per branch and PR.** Branch `feature/B08-create-authorization`, commit `feat(B08): ...`, PR title `[B08] ...`.
11. **Stay in scope.** Implement only the current step. Do not refactor unrelated code. Do not add dependencies without asking.
12. **Do not invent requirements.** If a rule is ambiguous, check section "Decisions" in `03-domain-and-contract.md`; if still unclear, ask.

## 3. File map (load on demand)

| File | Load when |
|---|---|
| `docs/ai/01-architecture.md` | Creating or moving files, adding a use case, repository, provider or middleware |
| `docs/ai/02-tdd-workflow.md` | Writing any test; starting any step; checking Definition of Done |
| `docs/ai/03-domain-and-contract.md` | Any endpoint, DTO, error code, business rule, data model or env var |
| `docs/ai/04-steps-B01-B05.md` | Working on setup, Docker, CI, data model, authentication |
| `docs/ai/05-steps-B06-B10.md` | Working on users, locations, terminals, authorizations, deploy |
| `docs/ai/06-steps-B11-B15.md` | Working on heartbeat, QR emission, events, commands, QR validation |
| `docs/ai/07-steps-B16-B20.md` | Working on NFC, history, offline events, hardening |
| `docs/ai/STATUS.md` | Start of every session: which step is current; end of session: update it |

Do not load all step files at once. Load the one that contains the current step.

## 4. How to start a task

1. Open `docs/ai/STATUS.md` and identify the current step (for example B08).
2. Open the step file that contains it. Confirm the dependencies are marked done.
3. Read the step's "Lista de testes", "Critérios de aceitação" and "Definição de pronto".
4. Propose the plan in 5 lines: use cases, ports, endpoints, first test. Then follow the TDD loop.
5. When finished, run the checks below, tick the acceptance criteria, update `STATUS.md`.

## 5. Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the API with reload |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run `dist/main/server.js` |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (no database), fast |
| `npm run test:watch` | Unit tests in watch mode (TDD loop) |
| `npm run test:int` | Integration tests (supertest + PostgreSQL of tests) |
| `npm run test:cov` | Coverage |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:reset` | Prisma and seed |

Before saying a step is done, all of these must pass: `typecheck`, `lint`, `test`, `test:int`.

## 6. Conventions at a glance

| Topic | Rule |
|---|---|
| Identifiers in code | English (`CreateAuthorization`, `IUserRepository`) |
| API fields, DB columns, reason codes | Portuguese, exactly as in the contract (`usuarioId`, `senhaHash`, `FORA_DO_PERIODO`) |
| User-facing messages and test names | Portuguese (`it('deve negar quando a autorização está cancelada')`) |
| Use case folder | `src/useCases/<Module>/<UseCaseName>/` with `<Name>_UseCase.ts`, `<Name>_Controller.ts`, `<Name>_DTO.ts`, `<Name>_UseCase.spec.ts`, `index.ts` |
| Ports | `I` prefix: `IUserRepository`, `IClock`, `IHashProvider` |
| Repository methods | camelCase: `findByEmail`, `save`, `existsByEmail` |
| IDs | UUID v4 text (terminal command id is an increasing integer) |
| Instants | ISO 8601 UTC. Authorization dates and times are evaluated in `America/Sao_Paulo` |
| Error body | `{ "error": { "code", "message", "details?" } }` |

## 7. Ask before you

- change anything in the contract (route, field, code, status);
- add a library, change `tsconfig`, ESLint rules or the CI workflow;
- change the Prisma schema after B04 (a migration is fine; ask if it changes existing columns);
- skip a failing test, loosen an assertion or lower coverage to get green.

## 8. Language policy

Instruction files (this file, `01`, `02`) are in English. Domain files (`03` to `07`, `STATUS.md`) are in Portuguese because they derive from the course documents. Code comments: English, short, only where the reason is not obvious.
