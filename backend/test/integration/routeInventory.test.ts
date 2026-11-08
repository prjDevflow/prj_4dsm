import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import { loadOpenApiSpec } from '../../src/main/openapi';
import { bearer, insertTerminal, insertUser, resetDatabase } from './helpers';
import { listRegisteredRoutes, routeKey, toOpenApiPath } from './routeInventory';

type Actor = 'nenhum' | 'admin' | 'usuario' | 'terminal';

/**
 * How each route reads its input, and so what the generic checks below send it:
 * - `body`: a JSON body. An array is never a valid body, so it must give 422.
 * - `query`: query string filters. The given `query` is invalid, so it must give 422.
 * - `param`: only a `:id` in the path (and no body). A malformed id cannot match anything: 404 NOT_FOUND
 *   (decision of B06: not 422, so the database never sees it).
 * - `none`: takes no input at all.
 */
type Input =
  | { kind: 'body'; as: Actor }
  | { kind: 'query'; as: Actor; query: string }
  | { kind: 'param'; as: Actor }
  | { kind: 'none'; as: Actor };

const page = 'page=abc';

// Every route has to be listed: a new route without an entry fails the first test below, which forces
// whoever adds it to say how its input is validated.
const INVENTORY: Record<string, Input> = {
  'GET /health': { kind: 'none', as: 'nenhum' },
  'GET /ready': { kind: 'none', as: 'nenhum' },
  'POST /auth/login': { kind: 'body', as: 'nenhum' },
  'GET /auth/me': { kind: 'none', as: 'usuario' },
  'POST /users': { kind: 'body', as: 'admin' },
  'GET /users': { kind: 'query', as: 'admin', query: page },
  'GET /users/:id': { kind: 'param', as: 'admin' },
  'PATCH /users/:id': { kind: 'body', as: 'admin' },
  'POST /buildings': { kind: 'body', as: 'admin' },
  'GET /buildings': { kind: 'query', as: 'admin', query: page },
  'PATCH /buildings/:id': { kind: 'body', as: 'admin' },
  'POST /access-points': { kind: 'body', as: 'admin' },
  'GET /access-points': { kind: 'query', as: 'admin', query: page },
  'PATCH /access-points/:id': { kind: 'body', as: 'admin' },
  'POST /terminals': { kind: 'body', as: 'admin' },
  'GET /terminals': { kind: 'query', as: 'admin', query: page },
  'GET /terminals/:id': { kind: 'param', as: 'admin' },
  'PATCH /terminals/:id': { kind: 'body', as: 'admin' },
  'POST /terminals/:id/rotate-key': { kind: 'param', as: 'admin' },
  'POST /terminals/:id/enroll-mode': { kind: 'body', as: 'admin' },
  'POST /nfc-tags': { kind: 'body', as: 'admin' },
  'GET /nfc-tags': { kind: 'query', as: 'admin', query: page },
  'PATCH /nfc-tags/:id': { kind: 'body', as: 'admin' },
  'POST /authorizations': { kind: 'body', as: 'admin' },
  'GET /authorizations': { kind: 'query', as: 'admin', query: page },
  'GET /me/authorizations': { kind: 'query', as: 'usuario', query: page },
  'GET /authorizations/:id': { kind: 'param', as: 'admin' },
  'PATCH /authorizations/:id/cancel': { kind: 'body', as: 'admin' },
  'POST /access/qr/validate': { kind: 'body', as: 'usuario' },
  'GET /access-events': { kind: 'query', as: 'admin', query: page },
  'GET /me/access-events': { kind: 'query', as: 'usuario', query: page },
  'POST /terminal/heartbeat': { kind: 'body', as: 'terminal' },
  'POST /terminal/qr': { kind: 'none', as: 'terminal' },
  'POST /terminal/nfc': { kind: 'body', as: 'terminal' },
  'POST /terminal/events/batch': { kind: 'body', as: 'terminal' },
  'GET /terminal/commands': { kind: 'query', as: 'terminal', query: 'limit=abc' },
  'POST /terminal/commands/:id/ack': { kind: 'param', as: 'terminal' },
};

const KEY = 'chave-de-teste-do-terminal-0123456789abcdef';
const app = createApp();
const routes = listRegisteredRoutes();

let headers: Record<Actor, Record<string, string>>;

beforeAll(async () => {
  await resetDatabase();
  const admin = await insertUser({ perfil: 'ADMIN' });
  const visitor = await insertUser({ perfil: 'VISITANTE' });
  const terminal = await insertTerminal({
    apiKeyHash: createHash('sha256').update(KEY).digest('hex'),
  });
  headers = {
    nenhum: {},
    admin: { Authorization: bearer(admin) },
    usuario: { Authorization: bearer(visitor) },
    terminal: { 'X-Terminal-Id': terminal.id, 'X-Terminal-Key': KEY },
  };
});

const send = (route: { method: string; path: string }, as: Actor, path: string) =>
  request(app)[route.method as 'get' | 'post' | 'patch'](`/api/v1${path}`).set(headers[as]);

describe('inventário das rotas', () => {
  it('deve ter uma entrada para cada rota registrada e nenhuma para rota que não existe', () => {
    const registered = routes.map(routeKey).sort();

    expect(Object.keys(INVENTORY).sort()).toEqual(registered);
  });
});

describe('validação de entrada em todas as rotas', () => {
  const byKind = (kind: Input['kind']) =>
    routes.filter((route) => INVENTORY[routeKey(route)]?.kind === kind);

  it.each(byKind('body').map((route) => [routeKey(route)]))(
    '%s recusa um corpo que não é um objeto com 422 VALIDATION_ERROR',
    async (key) => {
      const route = routes.find((r) => routeKey(r) === key)!;
      const input = INVENTORY[key]!;
      const path = route.path.replace(':id', randomUUID());

      const res = await send(route, input.as, path).send([]);

      expect(res.status, JSON.stringify(res.body)).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    },
  );

  it.each(byKind('query').map((route) => [routeKey(route)]))(
    '%s recusa filtros inválidos na consulta com 422 VALIDATION_ERROR',
    async (key) => {
      const route = routes.find((r) => routeKey(r) === key)!;
      const input = INVENTORY[key] as Extract<Input, { kind: 'query' }>;

      const res = await send(route, input.as, `${route.path}?${input.query}`);

      expect(res.status, JSON.stringify(res.body)).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    },
  );

  it.each(byKind('param').map((route) => [routeKey(route)]))(
    '%s trata um id malformado como 404 NOT_FOUND, sem chegar ao banco',
    async (key) => {
      const route = routes.find((r) => routeKey(r) === key)!;
      const input = INVENTORY[key]!;
      const path = route.path.replace(':id', 'nao-e-um-id');

      const res = await send(route, input.as, path).send();

      expect(res.status, JSON.stringify(res.body)).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    },
  );
});

describe('openapi.yaml cobre as rotas', () => {
  const documented = () => {
    const paths = (
      loadOpenApiSpec() as unknown as { paths: Record<string, Record<string, unknown>> }
    ).paths;
    return Object.entries(paths).flatMap(([path, operations]) =>
      Object.keys(operations)
        .filter((method) => ['get', 'post', 'patch', 'put', 'delete'].includes(method))
        .map((method) => `${method.toUpperCase()} ${path}`),
    );
  };

  it('deve documentar todas as rotas registradas', () => {
    const missing = routes
      .map((route) => `${route.method.toUpperCase()} ${toOpenApiPath(route.path)}`)
      .filter((key) => !documented().includes(key));

    expect(missing).toEqual([]);
  });

  it('não deve documentar rota que a API não tem', () => {
    const registered = routes.map(
      (route) => `${route.method.toUpperCase()} ${toOpenApiPath(route.path)}`,
    );

    expect(documented().filter((key) => !registered.includes(key))).toEqual([]);
  });
});
