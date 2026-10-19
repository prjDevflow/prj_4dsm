# 02 — TDD workflow, test strategy and Definition of Done

Load this file when starting a step, writing any test, or checking Definition of Done.

## 1. The loop for every use case

The author wants to define the tests first and then the use case. Follow this order, no shortcuts.

1. **Test list.** Turn the step's acceptance criteria and rules into short test names in Portuguese. Put them in the spec as `it.todo('deve ...')`. One behavior per name. Include the unhappy paths and the boundaries (exact start time, exact end time, one minute outside).
2. **Shape.** Write only the types needed for the tests to compile: DTO type, entity fields, port method signatures, the empty use case class. No logic yet.
3. **Red.** Pick the simplest `it.todo`, turn it into a real test, run `npm run test:watch`, see it fail for the right reason.
4. **Green.** Write the minimum code to pass. Fake it if needed; the next test forces the real thing.
5. **Refactor.** With all tests green, remove duplication and improve names. Run the whole suite.
6. Repeat 3 to 5 until no `it.todo` is left.
7. **Outside-in for the adapter.** Write the integration test for the route first (red). Then Controller, route, Prisma repository method (green). Refactor.
8. **Close.** Run `typecheck`, `lint`, `test`, `test:int`. Tick the acceptance criteria. Update `STATUS.md` and `openapi.yaml`.

Rule of thumb: if a test passes the first time you run it, it proved nothing. Break the code on purpose once to see it fail.

## 2. Test layers

| Layer | Scope | Dependencies | Speed | Where |
|---|---|---|---|---|
| Unit | Use cases and pure rules | In-memory doubles, `FakeClock` | milliseconds | `src/**/<Name>_UseCase.spec.ts`, `src/entities/rules/*.spec.ts` |
| Integration | Route + middleware + use case + Prisma + PostgreSQL | Real database for tests, real container | seconds | `test/integration/**/*.test.ts` |
| Manual | Terminal, camera, GPS, deploy | Real devices | minutes | Marcos M1 to M7 |

What each layer must prove:

- Unit: every business rule and every branch, including boundaries. This is where the 15 mandatory QR cases and the 5 NFC cases live (decision logic).
- Integration: wiring, HTTP status and body shape, permissions (401 and 403), persistence, migrations, transactions and **concurrency**. Concurrency cannot be proven with in-memory doubles.
- Do not test: Prisma itself, Express itself, getters, DTO schemas one field at a time (test them through the route with one invalid-body case per rule).

## 3. Turning acceptance criteria into a test list

Example for B08 (create authorization). Each line becomes an `it.todo`.

```typescript
describe('CreateAuthorization', () => {
  it.todo('deve criar a autorização com os oito campos e situação ATIVA');
  it.todo('deve gravar criadoPorId e criadoEm usando o relógio injetado');
  it.todo('deve calcular usosRestantes igual a usosPermitidos na criação');
  it.todo('deve rejeitar usuário inexistente com NotFoundError');
  it.todo('deve rejeitar usuário inativo com erro de validação no campo usuarioId');
  it.todo('deve rejeitar local inativo');
  it.todo('deve rejeitar dataFim anterior a dataInicio');
  it.todo('deve aceitar dataFim igual a dataInicio');
  it.todo('deve rejeitar dataFim no passado no fuso de São Paulo');
  it.todo('deve rejeitar horaFim igual a horaInicio');
  it.todo('deve rejeitar usosPermitidos 0 e 1001');
});
```

Naming: `deve <resultado> quando <condição>`. Names describe behavior, never implementation.

## 4. Unit spec skeleton

Use a `makeSut` factory so each test starts from a clean state. No shared mutable variables across tests.

```typescript
import { describe, it, expect } from 'vitest';
import { LoginUserUseCase } from './LoginUser_UseCase';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { FakeHashProvider } from '../../../../test/doubles/FakeHashProvider';
import { FakeTokenProvider } from '../../../../test/doubles/FakeTokenProvider';
import { makeUser } from '../../../../test/factories/makeUser';

const makeSut = () => {
  const users = new InMemoryUserRepository();
  const hash = new FakeHashProvider();
  const tokens = new FakeTokenProvider();
  const sut = new LoginUserUseCase(users, hash, tokens);
  return { sut, users, hash, tokens };
};

describe('LoginUser', () => {
  it('deve devolver token e usuário sem o hash da senha', async () => {
    const { sut, users, hash } = makeSut();
    await users.save(makeUser({ email: 'a@b.com', senhaHash: await hash.hash('12345678') }));

    const result = await sut.execute({ email: 'a@b.com', senha: '12345678' });

    expect(result.accessToken).toBeTruthy();
    expect(result.usuario).not.toHaveProperty('senhaHash');
  });

  it('deve usar a mesma resposta para e-mail inexistente e senha errada', async () => {
    const { sut, users } = makeSut();
    await users.save(makeUser({ email: 'a@b.com' }));
    const unknown = await sut.execute({ email: 'x@b.com', senha: '12345678' }).catch((e) => e);
    const wrong = await sut.execute({ email: 'a@b.com', senha: 'errada123' }).catch((e) => e);
    expect(unknown.code).toBe(wrong.code);
    expect(unknown.message).toBe(wrong.message);
  });
});
```

## 5. Doubles and factories

- **Prefer in-memory fakes over mocks** for repositories: they behave like the real thing (uniqueness, filters) and survive refactors. Use `vi.fn()` spies only to assert interactions that matter (for example: "the logger received the error", "the event write failed").
- A fake must keep the semantics the use case relies on. `InMemoryAccessGrantRepository.commitApproval` is all-or-nothing and returns the same `reason` values as the real one.
- `FakeClock` is the main tool for time rules:

```typescript
export class FakeClock implements IClock {
  constructor(private current = new Date('2026-10-20T14:00:00Z')) {}
  now() { return new Date(this.current); }
  set(date: Date) { this.current = date; }
  advance(ms: number) { this.current = new Date(this.current.getTime() + ms); }
}
```

- Factories (`makeUser`, `makeAuthorization`, `makeTerminal`) return valid objects with sensible defaults and accept overrides. Tests state only the fields that matter to the case.
- Keep a few **golden values**: coordinates 99 m and 101 m from the terminal; times `08:00`, `18:00`, `18:01`; a QR emitted at T and checked at T+10 s, T+15 s, T+16 s.

## 6. Integration tests

Setup (once): `DATABASE_URL` points to a dedicated test database; migrations are applied by `npm run test:int` (or by the CI step) before the run; `resetDatabase()` truncates all tables with `RESTART IDENTITY CASCADE` in `beforeEach`. Files run sequentially (`fileParallelism: false`) because they share one database.

Seed minimal data through small helpers in `test/integration/helpers.ts` (`seedAdmin`, `seedVisitor`, `seedTerminal`, `loginAs`). Do not depend on `db:seed` data.

```typescript
import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../../src/main/app';
import { resetDatabase, seedAdmin, seedVisitor, seedAccessPoint, loginAs } from './helpers';

describe('POST /api/v1/authorizations', () => {
  beforeEach(resetDatabase);

  it('201 para ADMIN e 403 para VISITANTE', async () => {
    const admin = await seedAdmin();
    const visitor = await seedVisitor();
    const point = await seedAccessPoint();
    const body = { usuarioId: visitor.id, accessPointId: point.id,
      dataInicio: '2099-01-01', dataFim: '2099-01-02',
      horaInicio: '08:00', horaFim: '18:00', usosPermitidos: 3 };

    const ok = await request(app).post('/api/v1/authorizations')
      .set('Authorization', `Bearer ${await loginAs(admin)}`).send(body);
    const denied = await request(app).post('/api/v1/authorizations')
      .set('Authorization', `Bearer ${await loginAs(visitor)}`).send(body);

    expect(ok.status).toBe(201);
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');
  });
});
```

Integration tests use the system clock. To test expiry, insert the row with a past `expiraEm` through a helper instead of waiting.

Concurrency pattern (B15, B17, B19):

```typescript
it('apenas uma de duas validações simultâneas do mesmo QR é aprovada', async () => {
  const { token, qr, payload } = await seedScenarioWithOneValidCredential();
  const send = () => request(app).post('/api/v1/access/qr/validate')
    .set('Authorization', `Bearer ${token}`).send(payload);

  const [a, b] = await Promise.all([send(), send()]);

  expect([a.status, b.status].sort()).toEqual([200, 403]);
  const denied = a.status === 403 ? a : b;
  expect(denied.body.error.code).toBe('CREDENCIAL_REUTILIZADA');
  expect(await countEvents()).toBe(2);
  expect(await usosRealizados()).toBe(1);
});
```

## 7. Tooling

- **Vitest** for unit and integration (fast, TypeScript without extra transform). Jest with `ts-jest` also works if the team prefers; keep one runner only. **supertest** for HTTP. `@vitest/coverage-v8` for coverage.
- Two configs so `npm test` never needs a database.

```typescript
// vitest.config.ts  (unit)
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/entities/**', 'src/useCases/**'],
      exclude: ['**/index.ts', '**/*_DTO.ts', '**/*_Controller.ts'],
      thresholds: { lines: 80, branches: 75 },
    },
  },
});

// vitest.int.config.ts  (integration)
export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    setupFiles: ['test/integration/setup.ts'],
    fileParallelism: false,
    testTimeout: 15000,
  },
});
```

- Verify option names against the installed Vitest version when adding it.
- **Boundary lint** (starting point, verify with the installed ESLint): forbid inner layers from importing outer ones.

```javascript
{
  files: ['src/entities/**/*.ts', 'src/useCases/**/*.ts', 'src/repositories/**/*.ts', 'src/providers/**/*.ts'],
  ignores: ['src/useCases/**/index.ts', '**/*.spec.ts'],
  rules: {
    '@typescript-eslint/no-restricted-imports': ['error', {
      patterns: [{ group: ['**/infra/**', '**/main/**'], message: 'Inner layers must not import infra or main.' }],
      paths: [
        { name: '@prisma/client', message: 'Use a repository port.' },
        { name: 'bcrypt', message: 'Use IHashProvider.' },
        { name: 'jsonwebtoken', message: 'Use ITokenProvider.' },
        { name: 'express', allowTypeImports: true, message: 'Only types, and only in Controllers.' },
      ],
    }],
  },
}
```

- CI runs: install (cached) → lint → typecheck/build → migrate test database → unit tests with coverage → integration tests. PostgreSQL is a service of the job.

## 8. Test quality rules

- Arrange, Act, Assert. One reason to fail per test.
- No logic (`if`, loops) inside tests; no real time, no randomness, no network.
- Assert the outcome (returned value, state in the fake, error `code`), not call counts, unless the call itself is the requirement.
- For errors assert `code` and `status`, not only the message text.
- Every bug found later gets a regression test first, then the fix.
- Never weaken or delete a test to get green. If a test is wrong, say why and fix the test explicitly.

## 9. Commit rhythm (evidence of TDD for the course)

Small commits per step ID, in this order when practical:

- `test(B08): lista de testes e primeiro caso (red)`
- `feat(B08): cria autorização com validações (green)`
- `refactor(B08): extrai validação de janela de datas`
- `test(B08): integração da rota POST /authorizations`
- `docs(B08): atualiza openapi`

## 10. Definition of Done — common to every step

A step is done only when all of these are true, in addition to the step's own checklist.

- [ ] Tests were written before the code; no `it.todo` left; each acceptance criterion maps to at least one test.
- [ ] `npm run typecheck`, `lint`, `test` and `test:int` pass locally and in CI.
- [ ] TypeScript `strict`; no `any` without a justification comment.
- [ ] Input validated at the edge (zod); errors in the standard format `{ error: { code, message, details? } }`.
- [ ] Dependency rule respected (file 01, section 1); boundary lint passes.
- [ ] Endpoint documented in `openapi.yaml` with request, responses, errors and an example.
- [ ] Authorization tested on protected routes: 401 without token, 403 with the wrong profile.
- [ ] No secret in code; new variables added to `.env.example` and validated in `config/env.ts`.
- [ ] Prisma migration versioned and applicable to an empty database.
- [ ] Logs contain no passwords, tokens or terminal keys.
- [ ] Pull request reviewed by another person, CI green, merged into `develop`.
- [ ] Demonstrable through Swagger or `curl` in the `docker compose` environment.

## 11. Anti-patterns to refuse

- Writing the use case first and the tests afterwards "to cover it".
- Mocking the repository with `vi.fn()` for every method instead of using the in-memory fake.
- Tests that depend on execution order or on the seed data.
- Calling `new Date()` or `Date.now()` inside entities or use cases.
- Asserting on Prisma objects or SQL text in unit tests.
- Using a unit test to claim atomicity or concurrency safety.
