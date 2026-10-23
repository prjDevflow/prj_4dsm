---
description: Close a backend step. Runs all checks, verifies acceptance criteria and DoD, calls the reviewer subagent, updates README/openapi/STATUS, pushes and opens the pull request against develop.
argument-hint: "[step ID, optional] [--base <branch>]"
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git log:*), Bash(git diff:*)
---

Close the current backend step. Arguments: **$ARGUMENTS** (optional step ID, optional `--base <branch>`).

Repository state right now (read-only snapshot):

- Current branch: !`git branch --show-current`
- Working tree: !`git status --short`
- Recent commits: !`git log --oneline -20`

**Base branch (BASE).** BASE is `develop`, unless the arguments contain `--base <branch>` (stacked branch: the previous step's PR is not merged yet). If no `--base` was given but `git log develop..HEAD --oneline` contains commits of another step ID (for example `(B04)` in a `B05` branch), the branch is probably stacked: ask me for the base before going on. Everywhere below, BASE means this branch.

Assume the working directory is `backend/`. If the workspace is the monorepo root, prefix doc paths with `backend/`. Write the PR, commit messages and all user-facing text in Portuguese. Follow `AGENTS.md`.

## 1. Preconditions

1. The step ID is the argument, or the step ID inside the current branch name (`feature/B08-create-authorization` is `B08`). If the branch is `develop` or `main`, or the ID cannot be found, stop and ask.
2. If the working tree has uncommitted changes, show them and commit the ones that belong to the step (small commits, explicit file staging, never `.env`, `dist/` or secrets). Ask me about anything unrelated.
3. Read the step in its file (`docs/ai/04` to `07`), its acceptance criteria and Definition of Done, plus the common DoD in `docs/ai/02-tdd-workflow.md` (section 10).

## 2. Run the checks

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:int` and `npm run test:cov`. If the database for integration tests is not running, start it with the project's compose command and say so.

If something fails, fix it test-first (a failing test that reproduces the problem, then the fix, each as its own commit) and run everything again. Do not continue to the pull request with a failing check. If you cannot fix it, stop and report.

## 3. Verify acceptance criteria and DoD

Go through every item of the step's "Critérios de aceitação" and "Definição de pronto", and the common DoD. For each item give the evidence (test name, command output, file). Items that need a manual step (Swagger demo, real terminal, notifying Lucas or Pedro) are listed as pending for me, not marked done.

## 4. Independent review

Invoke the `reviewer` subagent with the step ID and tell it the BASE and ask it to review the branch against BASE (`git diff <BASE>...HEAD`). Then:

- Fix every **bloqueante** (test-first when it is behavior), commit, re-run section 2 and re-invoke the reviewer until there are no blockers.
- Show me the **recomendado** items and fix those I agree with.

## 5. Documentation

Update only what the step changed:

- `openapi.yaml`: request, responses, errors and an example for each endpoint touched.
- Backend `README.md`: new or changed scripts, environment variables (also `.env.example`), how to run and test, endpoint group or feature description. Keep it short; do not rewrite unrelated sections.
- `docs/ai/STATUS.md`: set the step to 🟨 with the PR link (I mark ✅ after the merge), add a row to "Registro de sessões", add decisions to the ADR list if any were made.

Commit as `docs(<ID>): <descrição>`.

## 6. Push and pull request

1. `git push -u origin <branch>`.
2. Build the PR body in a temporary file outside the repository and create the PR with `gh pr create --base <BASE> --head <branch> --title "[<ID>] <nome da etapa>" --body-file <file>`. If `gh` is not available or not authenticated, print the title and body and the compare URL for me to open it manually.
3. Do not squash or rewrite commits: the PR must list all small commits.
   If BASE is not `develop`, the PR description starts with a line saying it depends on the PR of BASE and must be merged only after it, and the title keeps the form `[<ID>] <nome da etapa>`.
4. Keep the commit and PR attribution lines that the environment configures.

PR body (Portuguese, fill every section):

```
## Resumo
2 a 4 frases: o que a etapa entrega, requisitos atendidos (RFxx, RNFxx) e o que ela destrava.

## O que foi feito
- use cases, regras, endpoints, migrações, variáveis de ambiente

## Como rodar
1. git checkout <branch>
2. cp .env.example .env (variáveis novas: ...)
3. docker compose up -d db e npm ci
4. npm run db:migrate
5. npm run dev (Swagger em /docs)

## Como testar
- Automatizados: npm test (unitários) e npm run test:int (integração); total de testes novos
- Manual: passos curtos com curl ou Swagger, com a resposta esperada

## Critérios de aceitação
- [x] ... (um item por critério da etapa)

## Definição de pronto
- [x] ... (itens do DoD comum e da etapa; pendentes ficam [ ] com o motivo)

## Commits
lista completa de git log <BASE>..HEAD --oneline

## Contrato e impacto
Mudou algo no contrato? Quem precisa ser avisado (Lucas, Pedro) e o que mudou.

## Pendências e observações
Itens manuais, decisões tomadas, riscos, perguntas em aberto.
```

## 7. Final message to me

In Portuguese, short: the PR link, the result of each check, reviewer verdict, what is still pending on my side (manual tests, who should review the PR, who to notify), and a reminder to merge with a merge commit or rebase (not squash) if I want to keep the TDD history. For a stacked PR also tell me what to do after the base PR is merged: GitHub retargets the PR to `develop` by itself when the base branch is deleted on merge (otherwise `gh pr edit <n> --base develop`); if the base was squash-merged, run `git rebase --onto develop <BASE> <branch>` and `git push --force-with-lease`, and only then merge.
