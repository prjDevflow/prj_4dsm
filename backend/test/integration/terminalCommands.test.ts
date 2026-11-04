import { createHash } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { TerminalCommand } from '../../src/entities/TerminalCommand';
import { PrismaTerminalCommandRepository } from '../../src/infra/repositories/PrismaTerminalCommandRepository';
import { createApp } from '../../src/main/app';
import {
  bearer,
  insertTerminal,
  insertTerminalCommand,
  insertUser,
  prisma,
  resetDatabase,
} from './helpers';

const app = createApp();
const commands = new PrismaTerminalCommandRepository(prisma);

const KEY = 'chave-de-teste-do-terminal-0123456789abcdef';
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

const credentials = (terminalId: string, key: string = KEY) => ({
  'X-Terminal-Id': terminalId,
  'X-Terminal-Key': key,
});

const listCommands = (terminalId: string, query = '') =>
  request(app).get(`/api/v1/terminal/commands${query}`).set(credentials(terminalId));

const ack = (terminalId: string, commandId: number | string) =>
  request(app).post(`/api/v1/terminal/commands/${commandId}/ack`).set(credentials(terminalId));

const insertAuthenticatedTerminal = (overrides = {}) =>
  insertTerminal({ apiKeyHash: sha256(KEY), ...overrides });

/** A command created `ageMs` ago, valid for 10 s from then. */
const commandAged = (terminalId: string, ageMs: number, overrides = {}) =>
  insertTerminalCommand({ terminalId, criadoEm: new Date(Date.now() - ageMs), ...overrides });

const stored = (id: number) => prisma.terminalCommand.findUniqueOrThrow({ where: { id } });
const idsOf = (body: { commands: { id: number }[] }) => body.commands.map((command) => command.id);

describe('GET /api/v1/terminal/commands', () => {
  beforeEach(resetDatabase);

  it('401 UNAUTHORIZED com chave errada, sem cabeçalhos ou só com um token de usuário', async () => {
    const terminal = await insertAuthenticatedTerminal();
    const admin = await insertUser({ perfil: 'ADMIN' });
    await commandAged(terminal.id, 0);

    const wrongKey = await listCommands(terminal.id, '').set('X-Terminal-Key', 'outra-chave');
    const noHeaders = await request(app).get('/api/v1/terminal/commands');
    const userToken = await request(app)
      .get('/api/v1/terminal/commands')
      .set('Authorization', bearer(admin));

    for (const res of [wrongKey, noHeaders, userToken]) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('403 FORBIDDEN para terminal inativo com a chave certa', async () => {
    const terminal = await insertAuthenticatedTerminal({ ativo: false });
    await commandAged(terminal.id, 0);

    const res = await listCommands(terminal.id);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('200 com o comando criado, em até 1 s, no formato do contrato (ABRIR e NEGAR)', async () => {
    const terminal = await insertAuthenticatedTerminal();
    const startedAt = Date.now();
    const open = await commands.create(
      TerminalCommand.open({
        terminalId: terminal.id,
        now: new Date(),
        ttlSeconds: 10,
        aberturaMs: 5000,
      }),
    );
    const deny = await commands.create(
      TerminalCommand.deny({
        terminalId: terminal.id,
        motivo: 'DISTANTE_DO_TERMINAL',
        now: new Date(),
        ttlSeconds: 10,
      }),
    );

    const res = await listCommands(terminal.id);

    expect(Date.now() - startedAt).toBeLessThan(1000);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      commands: [
        {
          id: open.id,
          tipo: 'ABRIR',
          aberturaMs: 5000,
          criadoEm: open.criadoEm.toISOString(),
        },
        {
          id: deny.id,
          tipo: 'NEGAR',
          motivo: 'DISTANTE_DO_TERMINAL',
          criadoEm: deny.criadoEm.toISOString(),
        },
      ],
    });
  });

  it('200 com lista vazia quando não há comandos', async () => {
    const terminal = await insertAuthenticatedTerminal();

    const res = await listCommands(terminal.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ commands: [] });
  });

  it('entrega o comando de 9 s de vida e não entrega o de 11 s', async () => {
    const terminal = await insertAuthenticatedTerminal();
    const fresh = await commandAged(terminal.id, 9000);
    await commandAged(terminal.id, 11_000);

    const res = await listCommands(terminal.id);

    expect(idsOf(res.body)).toEqual([fresh.id]);
  });

  it('nunca mostra comandos de outro terminal', async () => {
    const terminal = await insertAuthenticatedTerminal();
    const other = await insertAuthenticatedTerminal();
    await commandAged(other.id, 0);
    const mine = await commandAged(terminal.id, 0);

    const res = await listCommands(terminal.id);

    expect(idsOf(res.body)).toEqual([mine.id]);
  });

  it('after evita reentrega e limit corta a lista, em ordem crescente de id', async () => {
    const terminal = await insertAuthenticatedTerminal();
    const created = [];
    for (let i = 0; i < 4; i += 1) created.push(await commandAged(terminal.id, 0));
    const [first, second, third, fourth] = created.map((command) => command.id);

    const afterSecond = await listCommands(terminal.id, `?after=${second}`);
    const limited = await listCommands(terminal.id, '?limit=2');
    const both = await listCommands(terminal.id, `?after=${first}&limit=2`);

    expect(idsOf(afterSecond.body)).toEqual([third, fourth]);
    expect(idsOf(limited.body)).toEqual([first, second]);
    expect(idsOf(both.body)).toEqual([second, third]);
  });

  it('usa after 0 e limit 10 quando não vêm na consulta', async () => {
    const terminal = await insertAuthenticatedTerminal();
    for (let i = 0; i < 12; i += 1) await commandAged(terminal.id, 0);

    const res = await listCommands(terminal.id);

    expect(res.body.commands).toHaveLength(10);
  });

  it.each([
    ['after=abc', 'after'],
    ['after=-1', 'after'],
    ['after=1.5', 'after'],
    ['after=99999999999', 'after'],
    ['after=1&after=2', 'after'],
    ['limit=0', 'limit'],
    ['limit=101', 'limit'],
    ['limit=abc', 'limit'],
    ['limit=2.5', 'limit'],
  ])('422 VALIDATION_ERROR para a consulta ?%s, apontando o campo %s', async (query, field) => {
    const terminal = await insertAuthenticatedTerminal();
    await commandAged(terminal.id, 0);

    const res = await listCommands(terminal.id, `?${query}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([expect.objectContaining({ field })]);
  });

  it('aceita limit 1 e limit 100 (as pontas)', async () => {
    const terminal = await insertAuthenticatedTerminal();
    await commandAged(terminal.id, 0);

    expect((await listCommands(terminal.id, '?limit=1')).status).toBe(200);
    expect((await listCommands(terminal.id, '?limit=100')).status).toBe(200);
  });

  it('grava entregueEm na primeira consulta e preserva nas seguintes', async () => {
    const terminal = await insertAuthenticatedTerminal();
    const created = await commandAged(terminal.id, 0);
    expect((await stored(created.id)).entregueEm).toBeNull();

    await listCommands(terminal.id);
    const first = (await stored(created.id)).entregueEm;
    await new Promise((resolve) => setTimeout(resolve, 20));
    await listCommands(terminal.id);

    expect(first).not.toBeNull();
    expect((await stored(created.id)).entregueEm).toEqual(first);
  });

  it('não marca como entregue o comando vencido nem o terminal de outro', async () => {
    const terminal = await insertAuthenticatedTerminal();
    const other = await insertAuthenticatedTerminal();
    const expired = await commandAged(terminal.id, 11_000);
    const foreign = await commandAged(other.id, 0);

    await listCommands(terminal.id);

    expect((await stored(expired.id)).entregueEm).toBeNull();
    expect((await stored(foreign.id)).entregueEm).toBeNull();
  });

  it('consultas simultâneas entregam o comando a todas e gravam entregueEm', async () => {
    const terminal = await insertAuthenticatedTerminal();
    const created = await commandAged(terminal.id, 0);

    const responses = await Promise.all(Array.from({ length: 8 }, () => listCommands(terminal.id)));

    for (const res of responses) expect(idsOf(res.body)).toEqual([created.id]);
    expect((await stored(created.id)).entregueEm).not.toBeNull();
  });
});

describe('POST /api/v1/terminal/commands/:id/ack', () => {
  beforeEach(resetDatabase);

  it('401 UNAUTHORIZED sem cabeçalhos, com chave errada ou só com token de usuário, sem gravar', async () => {
    const terminal = await insertAuthenticatedTerminal();
    const admin = await insertUser({ perfil: 'ADMIN' });
    const created = await commandAged(terminal.id, 0);
    const url = `/api/v1/terminal/commands/${created.id}/ack`;

    const wrongKey = await ack(terminal.id, created.id).set('X-Terminal-Key', 'outra-chave');
    const noHeaders = await request(app).post(url);
    const userToken = await request(app).post(url).set('Authorization', bearer(admin));

    for (const res of [wrongKey, noHeaders, userToken]) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    }
    expect((await stored(created.id)).executadoEm).toBeNull();
  });

  it('403 FORBIDDEN para terminal inativo, sem gravar', async () => {
    const terminal = await insertAuthenticatedTerminal({ ativo: false });
    const created = await commandAged(terminal.id, 0);

    const res = await ack(terminal.id, created.id);

    expect(res.status).toBe(403);
    expect((await stored(created.id)).executadoEm).toBeNull();
  });

  it('204 sem corpo e grava executadoEm no comando do próprio terminal', async () => {
    const terminal = await insertAuthenticatedTerminal();
    const created = await commandAged(terminal.id, 0);
    const before = Date.now();

    const res = await ack(terminal.id, created.id);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    const executadoEm = (await stored(created.id)).executadoEm;
    expect(Math.abs((executadoEm?.getTime() ?? 0) - before)).toBeLessThan(5000);
  });

  it('204 também para o comando já vencido que o terminal recebeu', async () => {
    const terminal = await insertAuthenticatedTerminal();
    const created = await commandAged(terminal.id, 11_000, { entregueEm: new Date() });

    const res = await ack(terminal.id, created.id);

    expect(res.status).toBe(204);
    expect((await stored(created.id)).executadoEm).not.toBeNull();
  });

  it('204 de novo e preserva o primeiro executadoEm quando o ack se repete', async () => {
    const terminal = await insertAuthenticatedTerminal();
    const created = await commandAged(terminal.id, 0);
    await ack(terminal.id, created.id);
    const first = (await stored(created.id)).executadoEm;
    await new Promise((resolve) => setTimeout(resolve, 20));

    const res = await ack(terminal.id, created.id);

    expect(res.status).toBe(204);
    expect((await stored(created.id)).executadoEm).toEqual(first);
  });

  it('404 NOT_FOUND para comando de outro terminal, igual ao de um que não existe, sem gravar', async () => {
    const terminal = await insertAuthenticatedTerminal();
    const other = await insertAuthenticatedTerminal();
    const foreign = await commandAged(other.id, 0);

    const alheio = await ack(terminal.id, foreign.id);
    const inexistente = await ack(terminal.id, foreign.id + 1000);

    expect(alheio.status).toBe(404);
    expect(alheio.body.error.code).toBe('NOT_FOUND');
    expect(alheio.body).toEqual(inexistente.body);
    expect((await stored(foreign.id)).executadoEm).toBeNull();
  });

  it.each(['abc', '1.5', '-1', '0x10', '99999999999999'])(
    '404 NOT_FOUND para o id %s, sem chegar ao banco',
    async (id) => {
      const terminal = await insertAuthenticatedTerminal();

      const res = await ack(terminal.id, id);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    },
  );
});
