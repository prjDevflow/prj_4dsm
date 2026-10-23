---
description: Start a backend step. Reads the docs, writes a development plan, waits for approval, then creates the branch and develops with TDD (small commits).
argument-hint: "[step ID, e.g. B08] [--base <branch>] [optional notes]"
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git log:*)
---

Start the backend step: **$ARGUMENTS**

Repository state right now (read-only snapshot):

- Current branch: !`git branch --show-current`
- Working tree: !`git status --short`
- Last commits: !`git log --oneline -5`

**Base branch (BASE).** BASE is `develop`, unless the arguments contain `--base <branch>`. Use `--base` for a stacked branch: when the previous step's pull request is not merged yet, the new branch starts from that step's branch. Everywhere below, BASE means this branch.

Assume the working directory is `backend/` (where `AGENTS.md` lives). If the workspace is the monorepo root, prefix the doc paths with `backend/`.

Write all user-facing text (plan, questions, commit messages) in Portuguese. Follow `AGENTS.md` rules at all times.

## Phase 1 — Understand (read-only, no changes)

1. Take the step ID from the arguments. If none was given, read `docs/ai/STATUS.md` and propose the next pending step, then ask me to confirm before going on.
2. Read `docs/ai/STATUS.md` and check that the step's dependencies are marked done. If one is not, tell me and ask whether to continue. With `--base`, a dependency whose PR is still open counts as satisfied by BASE; say so in the plan.
3. Read the step file that contains the step (B01-B05 in `docs/ai/04-steps-B01-B05.md`, B06-B10 in `05`, B11-B15 in `06`, B16-B20 in `07`), plus `docs/ai/02-tdd-workflow.md` and `docs/ai/01-architecture.md`. Read the parts of `docs/ai/03-domain-and-contract.md` the step touches.
4. Inspect the existing code the step will touch or reuse: ports, entities and rules, test doubles in `test/doubles`, factories, routes, Prisma schema. Do not assume; look.
5. Check the repository state from the snapshot above and with read-only git commands. Report problems instead of fixing them: uncommitted changes, a branch that is not `develop`, a local branch for this step that already exists, or a missing BASE (check local and `origin`). If BASE is not `develop`, say that this is a stacked branch and show the open PR of BASE when `gh` is available (`gh pr list --head <BASE>`).

## Phase 2 — Plan (then STOP)

Present the plan in Portuguese with exactly these sections, short and concrete:

1. **Etapa e objetivo:** ID, name, requirements (RFxx, RNFxx), dependencies and what it unblocks (★ for Lucas or Pedro).
2. **Estado do repositório:** branch atual, árvore limpa ou não, a BASE (e se é uma branch empilhada, com o PR que ela depende) e a branch que será criada (`feature/<ID>-<descrição-curta-em-kebab-case>`, por exemplo `feature/B08-create-authorization`).
3. **O que será criado ou alterado:** use cases, entities and rules, ports, providers, Prisma repositories, controllers, routes, migration, env variables, `openapi.yaml`.
4. **Lista de testes na ordem de execução:** unit (U) first, then integration (I), exactly as they will become `it.todo`. Include boundaries and the unhappy paths. Map each acceptance criterion to at least one test.
5. **Plano de commits:** the small commits in order (test red, feat green, refactor, integration test, route, migration, docs).
6. **Documentação a atualizar:** `openapi.yaml`, backend `README.md` (only if scripts, variables or run steps change), `.env.example`, `docs/ai/STATUS.md`.
7. **Riscos e decisões pendentes:** ambiguities, contract questions, new dependencies that need my approval.

Then ask: **"Posso começar?"** and **stop**. Until I approve, do not edit files and do not run any git command that changes state (no checkout, pull, branch, commit). If I ask for changes, revise the plan and ask again.

## Phase 3 — Develop (only after I approve)

### 3.1 Branch

1. The working tree must be clean. If it is not, stop and ask me what to do. Never discard changes.
2. `git fetch origin`, then `git checkout <BASE>` and `git pull --ff-only origin <BASE>`. If the pull is not a fast-forward, stop and ask.
3. `git checkout -b feature/<ID>-<short-description>` (the name from the plan, created from BASE). If the branch already exists, ask whether to continue on it.

### 3.2 TDD loop (file 02), one small group at a time

Keep a visible task list for the step and update it as you go. For each use case or rule, in plan order:

1. **Red:** turn the test list into `it.todo`, shape only the types needed to compile, write the first real test, run it (`npm test -- <file>`), and confirm it fails for the right reason. Commit: `test(<ID>): <descrição> (red)`.
2. **Green:** write the minimum code to pass, run the tests. Commit: `feat(<ID>): <descrição> (green)`.
3. Repeat red and green for each remaining test of that use case.
4. **Refactor** with everything green, run the whole unit suite. Commit: `refactor(<ID>): <descrição>`.
5. **Integration (outside-in):** write the supertest test for the route first and watch it fail (commit `test(<ID>): integração de <rota> (red)`), then Controller, `index.ts`, route and Prisma repository method (commit `feat(<ID>): <rota> e repositório (green)`). Add the Prisma migration in its own commit.
6. Add the `openapi.yaml` change and new variables to `.env.example` and `config/env.ts` in a `docs(<ID>)` or `feat(<ID>)` commit.

### 3.3 Rules while developing

- Stay inside the approved plan. If something outside it is needed, stop and ask.
- Never weaken, skip or delete a test to get green. Never use `--no-verify`, `git add -A` on unreviewed files, force pushes or history rewrites. Stage files explicitly and never commit `.env`, `dist/` or secrets.
- Each commit is one small, coherent change with a Portuguese message in the style `feat(B05): adiciona login com JWT`. Do not squash locally: the commit history is part of the TDD evidence.
- A contract change, a new dependency, or a change to existing Prisma columns needs my approval first.
- Run `npm run typecheck`, `npm run lint`, `npm test` after each green phase, and `npm run test:int` after each integration phase.

### 3.4 Finish

When every planned test is green and the checks pass, summarize in Portuguese: what was built, tests added (U and I), commits made, anything left open. Tell me to run `/close-step` for review, documentation and the pull request. Do not push and do not open the PR in this command. If the branch is stacked, remind me that its PR must wait for the PR of BASE, and that this branch must be rebased onto BASE whenever BASE changes (for example after review changes), and pass `--base <BASE>` to `/close-step`.
