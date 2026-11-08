import { performance } from 'node:perf_hooks';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import type { Prisma } from '../../src/generated/prisma/client';
import {
  bearer,
  insertAccessPoint,
  insertBuilding,
  insertTerminal,
  insertUser,
  prisma,
  resetDatabase,
} from './helpers';

const app = createApp();

const TOTAL = 10_000;
const LIMIT_MS = 300;
const START = Date.UTC(2026, 9, 1);

const REASONS = ['FORA_DO_PERIODO', 'USOS_ESGOTADOS', 'TAG_INATIVA', 'SEM_AUTORIZACAO'] as const;

// 10 thousand events, as the step asks. This proves the acceptance criterion and nothing more: a page
// of the whole request answers within 300 ms. It does NOT guard the indexes: with this volume
// PostgreSQL still answers in tens of milliseconds without them (checked by dropping the three
// indexes of `access_events`, and all of these tests still passed). The index check is the
// `EXPLAIN ANALYZE` recorded in STATUS.md, not this file.
describe('GET /access-events com 10 mil eventos', () => {
  let admin: Awaited<ReturnType<typeof insertUser>>;
  let someone: Awaited<ReturnType<typeof insertUser>>;
  let terminalId: string;
  let accessPointId: string;

  beforeAll(async () => {
    await resetDatabase();
    admin = await insertUser({ perfil: 'ADMIN' });
    const users = [await insertUser(), await insertUser(), await insertUser(), await insertUser()];
    someone = users[0]!;
    const building = await insertBuilding();
    const points = [
      await insertAccessPoint({ buildingId: building.id }),
      await insertAccessPoint({ buildingId: building.id }),
    ];
    const terminals = [
      await insertTerminal({ accessPointId: points[0]!.id }),
      await insertTerminal({ accessPointId: points[1]!.id }),
    ];
    terminalId = terminals[0]!.id;
    accessPointId = points[0]!.id;

    const data: Prisma.AccessEventCreateManyInput[] = Array.from({ length: TOTAL }, (_, i) => {
      const denied = i % 3 === 0;
      return {
        ocorridoEm: new Date(START + i * 60_000),
        usuarioId: users[i % users.length]!.id,
        accessPointId: points[i % 2]!.id,
        terminalId: terminals[i % 2]!.id,
        metodo: i % 2 === 0 ? 'QR' : 'NFC',
        resultado: denied ? 'NEGADO' : 'AUTORIZADO',
        motivo: denied ? REASONS[i % REASONS.length]! : null,
      };
    });
    await prisma.accessEvent.createMany({ data });
    expect(await prisma.accessEvent.count()).toBe(TOTAL);
    // Fresh statistics, as the database has after its first autovacuum.
    await prisma.$executeRawUnsafe('ANALYZE "access_events"');
  }, 60_000);

  // Do not leave 10 thousand events behind for the files that run after this one.
  afterAll(resetDatabase);

  /** The whole request: token, user lookup, query, count and JSON. Measured after a warm-up. */
  const timed = async (query: string) => {
    const start = performance.now();
    const res = await request(app)
      .get(`/api/v1/access-events${query}`)
      .set('Authorization', bearer(admin));
    return { res, ms: performance.now() - start };
  };

  it('devolve a primeira página em menos de 300 ms', async () => {
    await timed('');

    const { res, ms } = await timed('');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(TOTAL);
    expect(res.body.data).toHaveLength(20);
    expect(ms, `levou ${ms.toFixed(0)} ms`).toBeLessThan(LIMIT_MS);
  });

  it('devolve a última página, a mais funda, em menos de 300 ms', async () => {
    await timed('?pageSize=100');

    const { res, ms } = await timed('?page=100&pageSize=100');

    expect(res.body.data).toHaveLength(100);
    expect(ms, `levou ${ms.toFixed(0)} ms`).toBeLessThan(LIMIT_MS);
  });

  // Filters with an index and filters without one: each page must stay under the limit at this volume.
  it.each([
    ['usuarioId', () => `?usuarioId=${someone.id}`],
    ['accessPointId', () => `?accessPointId=${accessPointId}`],
    ['terminalId', () => `?terminalId=${terminalId}`],
    ['metodo e resultado', () => '?metodo=NFC&resultado=NEGADO'],
    ['motivo', () => '?motivo=TAG_INATIVA'],
    [
      'um dia (de e ate)',
      () =>
        `?de=${new Date(START + 1000 * 60_000).toISOString()}&ate=${new Date(START + 2440 * 60_000).toISOString()}`,
    ],
  ])('filtrado por %s devolve uma página em menos de 300 ms', async (_name, query) => {
    await timed(query());

    const { res, ms } = await timed(query());

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(ms, `levou ${ms.toFixed(0)} ms`).toBeLessThan(LIMIT_MS);
  });
});
