import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import {
  bearer,
  insertAccessPoint,
  insertAuthorization,
  insertNfcTag,
  insertTerminal,
  insertUser,
  prisma,
  resetDatabase,
} from './helpers';

const app = createApp();

const URL = '/api/v1/terminal/events/batch';
const TERMINAL_KEY = 'chave-de-teste-do-terminal-0123456789abcdef';
const UID = '04A1B2C3D4';
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
/** Distinct, valid UUIDs for the events of a batch. */
const key = (n: number) => `3f1c9a52-8e0b-4f55-9d57-${String(n).padStart(12, '0')}`;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

/** An active terminal with its point, and an active person with an active tag (and no authorization). */
async function seedScene({
  terminal = {},
}: { terminal?: Partial<Parameters<typeof insertTerminal>[0]> } = {}) {
  const person = await insertUser();
  const accessPoint = await insertAccessPoint({ nome: 'Catraca Social' });
  const device = await insertTerminal({
    accessPointId: accessPoint.id,
    apiKeyHash: sha256(TERMINAL_KEY),
    ...terminal,
  });
  const tag = await insertNfcTag({ usuarioId: person.id, uid: UID });
  return { user: person, accessPoint, terminal: device, tag };
}

type Scene = Awaited<ReturnType<typeof seedScene>>;

const credentials = (terminalId: string, terminalKey: string = TERMINAL_KEY) => ({
  'X-Terminal-Id': terminalId,
  'X-Terminal-Key': terminalKey,
});

/** One kept attempt as the terminal sends it; `n` makes the key distinct and the time a little earlier. */
const offlineEvent = (n: number, overrides: Record<string, unknown> = {}) => ({
  clientEventId: key(n),
  metodo: 'NFC',
  uid: UID,
  ocorridoEm: ago(n * MINUTE),
  resultado: 'NEGADO',
  motivo: 'TERMINAL_OFFLINE',
  ...overrides,
});

const sendBatch = (scene: Scene, events: unknown) =>
  request(app).post(URL).set(credentials(scene.terminal.id)).send({ events });

const stored = () => prisma.accessEvent.findMany({ orderBy: { clientEventId: 'asc' } });

describe('POST /api/v1/terminal/events/batch', () => {
  beforeEach(resetDatabase);

  describe('autenticação do terminal', () => {
    it('401 UNAUTHORIZED com chave errada, sem cabeçalhos ou só com um token de usuário', async () => {
      const scene = await seedScene();
      const admin = await insertUser({ perfil: 'ADMIN' });
      const body = { events: [offlineEvent(1)] };

      const wrongKey = await request(app)
        .post(URL)
        .set(credentials(scene.terminal.id, 'outra-chave'))
        .send(body);
      const noHeaders = await request(app).post(URL).send(body);
      const userToken = await request(app).post(URL).set('Authorization', bearer(admin)).send(body);

      for (const res of [wrongKey, noHeaders, userToken]) {
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
      }
      expect(await stored()).toHaveLength(0);
    });

    it('403 FORBIDDEN para terminal inativo com a chave certa, sem evento', async () => {
      const scene = await seedScene({ terminal: { ativo: false } });

      const res = await sendBatch(scene, [offlineEvent(1)]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(await stored()).toHaveLength(0);
    });
  });

  describe('lote válido', () => {
    it('200 com aceitos e duplicados, e um evento NFC negado por tentativa, com o instante do terminal', async () => {
      const scene = await seedScene();
      const at = new Date(Date.now() - 3 * DAY);

      const res = await sendBatch(scene, [
        offlineEvent(1, { ocorridoEm: at.toISOString() }),
        offlineEvent(2),
        offlineEvent(3),
      ]);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ aceitos: 3, duplicados: 0 });
      const rows = await stored();
      expect(rows).toHaveLength(3);
      expect(rows[0]).toMatchObject({
        terminalId: scene.terminal.id,
        accessPointId: scene.accessPoint.id,
        metodo: 'NFC',
        resultado: 'NEGADO',
        motivo: 'TERMINAL_OFFLINE',
        clientEventId: key(1),
        ocorridoEm: at,
        authorizationId: null,
        distanciaM: null,
        detalhes: { uid: UID },
      });
    });

    it('guarda o UID normalizado e a chave em minúsculas, e reconhece o reenvio escrito em maiúsculas', async () => {
      const scene = await seedScene();
      const upper = key(1).toUpperCase();

      const first = await sendBatch(scene, [
        offlineEvent(1, { clientEventId: upper, uid: '04:a1:b2:c3:d4' }),
      ]);
      const again = await sendBatch(scene, [offlineEvent(1)]);

      expect(first.body).toEqual({ aceitos: 1, duplicados: 0 });
      expect(again.body).toEqual({ aceitos: 0, duplicados: 1 });
      const rows = await stored();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ clientEventId: key(1), detalhes: { uid: UID } });
    });

    it('preenche o usuário pela tag do UID e deixa nulo quando a tag é desconhecida', async () => {
      const scene = await seedScene();

      await sendBatch(scene, [offlineEvent(1), offlineEvent(2, { uid: 'AABBCCDD' })]);

      const rows = await stored();
      expect(rows.map((row) => row.usuarioId)).toEqual([scene.user.id, null]);
    });

    it('ignora os campos que o terminal não deveria mandar: quem, onde e o id vêm do servidor', async () => {
      const scene = await seedScene();
      const stranger = await insertUser();
      const otherPoint = await insertAccessPoint();
      const otherTerminal = await insertTerminal({ accessPointId: otherPoint.id });
      const forgedId = randomUUID();

      const res = await sendBatch(scene, [
        offlineEvent(1, {
          id: forgedId,
          usuarioId: stranger.id,
          terminalId: otherTerminal.id,
          accessPointId: otherPoint.id,
          authorizationId: randomUUID(),
          distanciaM: 1,
        }),
      ]);

      expect(res.status).toBe(200);
      const [row] = await stored();
      expect(row).toMatchObject({
        usuarioId: scene.user.id,
        terminalId: scene.terminal.id,
        accessPointId: scene.accessPoint.id,
        authorizationId: null,
        distanciaM: null,
      });
      expect(row?.id).not.toBe(forgedId);
    });

    it('não consome uso, não altera a autorização e não cria comando para o terminal', async () => {
      const scene = await seedScene();
      const grant = await insertAuthorization({
        usuarioId: scene.user.id,
        accessPointId: scene.accessPoint.id,
        usosPermitidos: 3,
      });

      await sendBatch(scene, [offlineEvent(1), offlineEvent(2)]);

      const after = await prisma.authorization.findUniqueOrThrow({ where: { id: grant.id } });
      expect(after).toEqual(grant);
      expect(await prisma.terminalCommand.count()).toBe(0);
    });

    it('aceita ocorridoEm até 5 minutos à frente e até 7 dias atrás', async () => {
      const scene = await seedScene();

      const res = await sendBatch(scene, [
        offlineEvent(1, { ocorridoEm: new Date(Date.now() + 4 * MINUTE).toISOString() }),
        offlineEvent(2, { ocorridoEm: new Date(Date.now() - 6 * DAY).toISOString() }),
      ]);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ aceitos: 2, duplicados: 0 });
    });

    it('aceita um lote de 50 eventos', async () => {
      const scene = await seedScene();

      const res = await sendBatch(
        scene,
        Array.from({ length: 50 }, (_, i) => offlineEvent(i + 1)),
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ aceitos: 50, duplicados: 0 });
      expect(await prisma.accessEvent.count()).toBe(50);
    });
  });

  describe('duplicados', () => {
    it('grava cada evento uma única vez quando o mesmo lote é enviado duas vezes', async () => {
      const scene = await seedScene();
      const batch = [offlineEvent(1), offlineEvent(2), offlineEvent(3)];

      const first = await sendBatch(scene, batch);
      const second = await sendBatch(scene, batch);

      expect(first.body).toEqual({ aceitos: 3, duplicados: 0 });
      expect(second.status).toBe(200);
      expect(second.body).toEqual({ aceitos: 0, duplicados: 3 });
      expect(await prisma.accessEvent.count()).toBe(3);
    });

    it('conta 3 aceitos e 1 duplicado num lote com 3 novos e 1 já recebido', async () => {
      const scene = await seedScene();
      await sendBatch(scene, [offlineEvent(1)]);

      const res = await sendBatch(scene, [
        offlineEvent(1),
        offlineEvent(2),
        offlineEvent(3),
        offlineEvent(4),
      ]);

      expect(res.body).toEqual({ aceitos: 3, duplicados: 1 });
      expect(await prisma.accessEvent.count()).toBe(4);
    });

    it('conta como duplicado o evento repetido dentro do mesmo lote', async () => {
      const scene = await seedScene();

      const res = await sendBatch(scene, [offlineEvent(1), offlineEvent(1), offlineEvent(2)]);

      expect(res.body).toEqual({ aceitos: 2, duplicados: 1 });
      expect(await prisma.accessEvent.count()).toBe(2);
    });

    it('grava cada evento uma única vez quando o mesmo lote chega várias vezes ao mesmo tempo', async () => {
      const scene = await seedScene();
      const batch = Array.from({ length: 10 }, (_, i) => offlineEvent(i + 1));

      const responses = await Promise.all(Array.from({ length: 4 }, () => sendBatch(scene, batch)));

      expect(responses.map((res) => res.status)).toEqual([200, 200, 200, 200]);
      const accepted = responses.reduce((sum, res) => sum + (res.body.aceitos as number), 0);
      const duplicated = responses.reduce((sum, res) => sum + (res.body.duplicados as number), 0);
      expect(accepted).toBe(10);
      expect(duplicated).toBe(30);
      expect(await prisma.accessEvent.count()).toBe(10);
    });

    it('conta como duplicada uma chave que já é de outro terminal, sem alterar o evento dele', async () => {
      const scene = await seedScene();
      const otherPoint = await insertAccessPoint();
      const other = await insertTerminal({
        accessPointId: otherPoint.id,
        apiKeyHash: sha256(TERMINAL_KEY),
      });
      await sendBatch(scene, [offlineEvent(1)]);

      const res = await request(app)
        .post(URL)
        .set(credentials(other.id))
        .send({ events: [offlineEvent(1)] });

      expect(res.body).toEqual({ aceitos: 0, duplicados: 1 });
      const rows = await stored();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.terminalId).toBe(scene.terminal.id);
    });
  });

  describe('rejeição do lote (422, nada é gravado)', () => {
    const fieldsOf = (res: request.Response) =>
      (res.body.error.details as Array<{ field: string }>).map((detail) => detail.field);

    it('AUTORIZADO no meio do lote rejeita todos, com o índice no details', async () => {
      const scene = await seedScene();

      const res = await sendBatch(scene, [
        offlineEvent(1),
        offlineEvent(2, { resultado: 'AUTORIZADO' }),
        offlineEvent(3),
      ]);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(fieldsOf(res)).toEqual(['events.1.resultado']);
      expect(await stored()).toHaveLength(0);
    });

    it.each([
      ['6 minutos à frente', () => new Date(Date.now() + 6 * MINUTE).toISOString()],
      ['8 dias atrás', () => new Date(Date.now() - 8 * DAY).toISOString()],
    ])('ocorridoEm %s dá 422 em events.N.ocorridoEm', async (_label, instant) => {
      const scene = await seedScene();

      const res = await sendBatch(scene, [
        offlineEvent(1),
        offlineEvent(2, { ocorridoEm: instant() }),
      ]);

      expect(res.status).toBe(422);
      expect(fieldsOf(res)).toEqual(['events.1.ocorridoEm']);
      expect(await stored()).toHaveLength(0);
    });

    it('lista todos os problemas de todos os eventos, e não grava nem os válidos', async () => {
      const scene = await seedScene();

      const res = await sendBatch(scene, [
        offlineEvent(1),
        offlineEvent(2, { resultado: 'AUTORIZADO' }),
        offlineEvent(3, { uid: 'não é hexadecimal' }),
        offlineEvent(4, { metodo: 'QR', motivo: 'TAG_INATIVA' }),
      ]);

      expect(res.status).toBe(422);
      expect(fieldsOf(res)).toEqual([
        'events.1.resultado',
        'events.2.uid',
        'events.3.metodo',
        'events.3.motivo',
      ]);
      expect(await stored()).toHaveLength(0);
    });

    it('51 eventos dão 422 em events, sem gravar nenhum', async () => {
      const scene = await seedScene();

      const res = await sendBatch(
        scene,
        Array.from({ length: 51 }, (_, i) => offlineEvent(i + 1)),
      );

      expect(res.status).toBe(422);
      expect(fieldsOf(res)).toEqual(['events']);
      expect(await stored()).toHaveLength(0);
    });

    const malformed: [string, Record<string, unknown>, string][] = [
      [
        'clientEventId que não é UUID',
        { clientEventId: 'nao-e-um-uuid' },
        'events.0.clientEventId',
      ],
      ['clientEventId ausente', { clientEventId: undefined }, 'events.0.clientEventId'],
      ['UID com 7 caracteres', { uid: '04A1B2C' }, 'events.0.uid'],
      ['UID ausente', { uid: undefined }, 'events.0.uid'],
      ['UID que não é texto', { uid: 4_000_000_000 }, 'events.0.uid'],
      ['ocorridoEm que não é um instante', { ocorridoEm: 'ontem' }, 'events.0.ocorridoEm'],
      ['ocorridoEm ausente', { ocorridoEm: undefined }, 'events.0.ocorridoEm'],
      ['metodo desconhecido', { metodo: 'BIOMETRIA' }, 'events.0.metodo'],
      ['resultado desconhecido', { resultado: 'TALVEZ' }, 'events.0.resultado'],
      ['motivo desconhecido', { motivo: 'INVENTADO' }, 'events.0.motivo'],
    ];

    it.each(malformed)('%s dá 422 no campo certo', async (_label, overrides, field) => {
      const scene = await seedScene();

      const res = await sendBatch(scene, [offlineEvent(1, overrides)]);

      expect(res.status).toBe(422);
      expect(fieldsOf(res)).toContain(field);
      expect(await stored()).toHaveLength(0);
    });

    it.each([
      ['lote vazio', { events: [] }],
      ['events ausente', {}],
      ['events que não é lista', { events: 'nada' }],
      ['evento que não é objeto', { events: ['texto'] }],
    ])('%s dá 422', async (_label, body) => {
      const scene = await seedScene();

      const res = await request(app).post(URL).set(credentials(scene.terminal.id)).send(body);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('JSON malformado dá 422', async () => {
      const scene = await seedScene();

      const res = await request(app)
        .post(URL)
        .set(credentials(scene.terminal.id))
        .set('Content-Type', 'application/json')
        .send('{"events": [');

      expect(res.status).toBe(422);
    });
  });

  describe('tamanho do corpo (64 kb)', () => {
    const LIMIT = 64 * 1024;
    /** A JSON body of exactly `bytes` bytes (ASCII), padded with a field the route does not know. */
    const bodyOfSize = (bytes: number) => {
      const base = JSON.stringify({ events: [], padding: '' }).length;
      return JSON.stringify({ events: [], padding: 'x'.repeat(bytes - base) });
    };
    const post = (scene: Scene, body: string) =>
      request(app)
        .post(URL)
        .set(credentials(scene.terminal.id))
        .set('Content-Type', 'application/json')
        .send(body);

    it('413 PAYLOAD_TOO_LARGE com 1 byte acima de 64 kb, no formato padrão de erro', async () => {
      const scene = await seedScene();

      const res = await post(scene, bodyOfSize(LIMIT + 1));

      expect(res.status).toBe(413);
      expect(res.body).toEqual({
        error: { code: 'PAYLOAD_TOO_LARGE', message: expect.any(String) },
      });
      expect(await stored()).toHaveLength(0);
    });

    it('413 também para um corpo entre 64 kb e o limite geral de 100 kb', async () => {
      const scene = await seedScene();

      const res = await post(scene, bodyOfSize(90 * 1024));

      expect(res.status).toBe(413);
      expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    });

    it('com exatamente 64 kb o corpo passa do limite e chega à validação (422 do lote vazio)', async () => {
      const scene = await seedScene();

      const res = await post(scene, bodyOfSize(LIMIT));

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
