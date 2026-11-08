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
  newId,
  prisma,
  resetDatabase,
} from './helpers';

const app = createApp();

const TERMINAL_KEY = 'chave-de-teste-do-terminal-0123456789abcdef';
const UID = '04A1B2C3D4';
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const credentials = (terminalId: string) => ({
  'X-Terminal-Id': terminalId,
  'X-Terminal-Key': TERMINAL_KEY,
});

// The events here come through the real routes: the batch writes them, the history and the live NFC read
// must treat them as the contract says.
async function seedScene() {
  const admin = await insertUser({ perfil: 'ADMIN' });
  const maria = await insertUser({ nome: 'Maria Souza', perfil: 'VISITANTE' });
  const accessPoint = await insertAccessPoint({ nome: 'Catraca Social' });
  const terminal = await insertTerminal({
    accessPointId: accessPoint.id,
    nome: 'Terminal Social',
    apiKeyHash: sha256(TERMINAL_KEY),
  });
  const authorization = await insertAuthorization({
    usuarioId: maria.id,
    accessPointId: accessPoint.id,
    criadoPorId: admin.id,
    dataInicio: new Date('2020-01-01'),
    dataFim: new Date('2099-12-31'),
    horaInicio: '00:00',
    horaFim: '23:59',
    usosPermitidos: 3,
  });
  await insertNfcTag({ usuarioId: maria.id, uid: UID });
  return { admin, maria, accessPoint, terminal, authorization };
}

type Scene = Awaited<ReturnType<typeof seedScene>>;

const offlineEvent = (uid: string, at: Date, clientEventId = randomUUID()) => ({
  clientEventId,
  metodo: 'NFC',
  uid,
  ocorridoEm: at.toISOString(),
  resultado: 'NEGADO',
  motivo: 'TERMINAL_OFFLINE',
});

const sendBatch = (scene: Scene, events: unknown[]) =>
  request(app)
    .post('/api/v1/terminal/events/batch')
    .set(credentials(scene.terminal.id))
    .send({ events });

const liveRead = (scene: Scene, uid = UID) =>
  request(app)
    .post('/api/v1/terminal/nfc')
    .set(credentials(scene.terminal.id))
    .set('Idempotency-Key', randomUUID())
    .send({ uid });

const history = (scene: Scene, query = '') =>
  request(app).get(`/api/v1/access-events${query}`).set('Authorization', bearer(scene.admin));

describe('eventos offline no histórico e na leitura ao vivo', () => {
  beforeEach(resetDatabase);

  describe('histórico (B18)', () => {
    it('o admin vê o evento com TERMINAL_OFFLINE, o instante do terminal, a pessoa, o local e o terminal', async () => {
      const scene = await seedScene();
      const at = new Date(Date.now() - 2 * DAY);
      await sendBatch(scene, [offlineEvent(UID, at)]);

      const res = await history(scene, '?motivo=TERMINAL_OFFLINE');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0]).toEqual({
        id: expect.any(String),
        ocorridoEm: at.toISOString(),
        metodo: 'NFC',
        resultado: 'NEGADO',
        motivo: 'TERMINAL_OFFLINE',
        distanciaM: null,
        authorizationId: null,
        usuario: { id: scene.maria.id, nome: 'Maria Souza', perfil: 'VISITANTE' },
        local: expect.objectContaining({ id: scene.accessPoint.id, nome: 'Catraca Social' }),
        terminal: { id: scene.terminal.id, nome: 'Terminal Social' },
      });
    });

    it('não devolve o UID nem a chave do cliente', async () => {
      const scene = await seedScene();
      const clientEventId = randomUUID();
      await sendBatch(scene, [offlineEvent(UID, new Date(Date.now() - MINUTE), clientEventId)]);

      const res = await history(scene);

      expect(JSON.stringify(res.body)).not.toContain(UID);
      expect(JSON.stringify(res.body)).not.toContain(clientEventId);
    });

    it('a tag desconhecida aparece com usuario null', async () => {
      const scene = await seedScene();
      await sendBatch(scene, [offlineEvent('04FFFFFFFF', new Date(Date.now() - MINUTE))]);

      const res = await history(scene, '?motivo=TERMINAL_OFFLINE');

      expect(res.body.data[0]).toMatchObject({ usuario: null, motivo: 'TERMINAL_OFFLINE' });
    });

    it('o dono da tag vê o evento em /me/access-events, e o de tag desconhecida não aparece em /me', async () => {
      const scene = await seedScene();
      await sendBatch(scene, [
        offlineEvent(UID, new Date(Date.now() - MINUTE)),
        offlineEvent('04FFFFFFFF', new Date(Date.now() - 2 * MINUTE)),
      ]);

      const mine = await request(app)
        .get('/api/v1/me/access-events')
        .set('Authorization', bearer(scene.maria));

      expect(mine.body.total).toBe(1);
      expect(mine.body.data[0]).toMatchObject({
        motivo: 'TERMINAL_OFFLINE',
        usuario: { id: scene.maria.id },
      });
    });

    it('ordena e filtra pelo instante em que a tentativa ocorreu, não pelo do envio', async () => {
      const scene = await seedScene();
      const old = new Date(Date.now() - 3 * DAY);
      await prisma.accessEvent.create({
        data: {
          id: newId(),
          ocorridoEm: new Date(Date.now() - MINUTE),
          metodo: 'NFC',
          resultado: 'NEGADO',
          motivo: 'TAG_DESCONHECIDA',
          terminalId: scene.terminal.id,
          accessPointId: scene.accessPoint.id,
        },
      });
      await sendBatch(scene, [offlineEvent(UID, old)]);

      const all = await history(scene);
      const window = await history(
        scene,
        `?de=${encodeURIComponent(new Date(old.getTime() - DAY).toISOString())}` +
          `&ate=${encodeURIComponent(new Date(old.getTime() + DAY).toISOString())}`,
      );

      expect(all.body.data.map((e: { motivo: string }) => e.motivo)).toEqual([
        'TAG_DESCONHECIDA',
        'TERMINAL_OFFLINE',
      ]);
      expect(window.body.data.map((e: { motivo: string }) => e.motivo)).toEqual([
        'TERMINAL_OFFLINE',
      ]);
    });
  });

  describe('leitura NFC ao vivo (B17)', () => {
    it.each([
      ['2 s antes', -2000],
      ['no mesmo instante', 0],
      ['4 minutos à frente do relógio do servidor', 4 * MINUTE],
    ])(
      'a mesma tag lida logo depois de um lote offline (%s) é uma tentativa nova: AUTORIZADO, sem 409',
      async (_label, offset) => {
        const scene = await seedScene();
        await sendBatch(scene, [offlineEvent(UID, new Date(Date.now() + offset))]);

        const res = await liveRead(scene);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ resultado: 'AUTORIZADO', aberturaMs: expect.any(Number) });
        const grant = await prisma.authorization.findUniqueOrThrow({
          where: { id: scene.authorization.id },
        });
        expect(grant.usosRealizados).toBe(1);
      },
    );

    it('uma leitura ao vivo repetida em seguida continua devolvendo a decisão anterior, mesmo com um lote offline no meio', async () => {
      const scene = await seedScene();
      const first = await liveRead(scene);
      await sendBatch(scene, [offlineEvent(UID, new Date())]);

      const again = await liveRead(scene);

      expect(first.body.resultado).toBe('AUTORIZADO');
      expect(again.body).toEqual(first.body);
      const grant = await prisma.authorization.findUniqueOrThrow({
        where: { id: scene.authorization.id },
      });
      expect(grant.usosRealizados).toBe(1);
    });
  });
});
