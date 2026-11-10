import { createHash, randomBytes, randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import {
  bearer,
  insertAccessPoint,
  insertAuthorization,
  insertNfcTag,
  insertQrCredential,
  insertTerminal,
  insertUser,
  resetDatabase,
} from './helpers';

const app = createApp();

const TERMINAL_KEY = 'chave-de-teste-do-terminal-0123456789abcdef';
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

// The events here are made by the real access flow, not inserted by the test: the history must show
// what `POST /terminal/nfc` actually writes.
describe('o histórico mostra os eventos que o acesso por NFC grava', () => {
  beforeEach(resetDatabase);

  it('uma leitura aprovada e uma negada aparecem para o admin, e só a da pessoa em /me', async () => {
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
    await insertNfcTag({ usuarioId: maria.id, uid: '04A1B2C3D4' });
    const read = (uid: string) =>
      request(app)
        .post('/api/v1/terminal/nfc')
        .set({ 'X-Terminal-Id': terminal.id, 'X-Terminal-Key': TERMINAL_KEY })
        .set('Idempotency-Key', randomUUID())
        .send({ uid });

    const approved = await read('04A1B2C3D4');
    const unknown = await read('04FFFFFFFF');
    expect(approved.body.resultado).toBe('AUTORIZADO');
    expect(unknown.body).toEqual({ resultado: 'NEGADO', motivo: 'TAG_DESCONHECIDA' });

    const history = await request(app)
      .get('/api/v1/access-events')
      .set('Authorization', bearer(admin));
    const mine = await request(app)
      .get('/api/v1/me/access-events')
      .set('Authorization', bearer(maria));

    expect(history.body.total).toBe(2);
    // The two reads can share a millisecond, so the test does not rely on the order between them.
    expect(history.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metodo: 'NFC',
          resultado: 'NEGADO',
          motivo: 'TAG_DESCONHECIDA',
          usuario: null,
          authorizationId: null,
          terminal: { id: terminal.id, nome: 'Terminal Social' },
        }),
        expect.objectContaining({
          metodo: 'NFC',
          resultado: 'AUTORIZADO',
          motivo: null,
          usuario: { id: maria.id, nome: 'Maria Souza', perfil: 'VISITANTE' },
          authorizationId: authorization.id,
          local: expect.objectContaining({ id: accessPoint.id, nome: 'Catraca Social' }),
        }),
      ]),
    );
    expect(mine.body.total).toBe(1);
    expect(mine.body.data[0]).toMatchObject({ resultado: 'AUTORIZADO', metodo: 'NFC' });
  });
});

describe('o histórico mostra os eventos que o acesso por QR grava', () => {
  beforeEach(resetDatabase);

  const newToken = () => randomBytes(16).toString('base64url');

  /** An active person with a valid authorization for a point whose terminal issued `token` 3 s ago. */
  async function seedQrScene() {
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
    const token = newToken();
    const now = Date.now();
    await insertQrCredential({
      terminalId: terminal.id,
      tokenHash: sha256(token),
      emitidoEm: new Date(now - 3000),
      expiraEm: new Date(now + 12_000),
    });
    return { admin, maria, accessPoint, terminal, authorization, token };
  }

  // The access point is at -23.30512, -45.96551: this phone is about 11 m north of it.
  const NEAR = { latitude: -23.30502, longitude: -45.96551 };

  const validate = (user: Parameters<typeof bearer>[0], payload: string) =>
    request(app)
      .post('/api/v1/access/qr/validate')
      .set('Authorization', bearer(user))
      .send({ payload, ...NEAR });

  it('um QR aprovado aparece com a distância, a autorização, o local e o terminal', async () => {
    const { admin, maria, accessPoint, terminal, authorization, token } = await seedQrScene();

    const granted = await validate(maria, `ACS1:${token}`);
    expect(granted.status).toBe(200);

    const history = await request(app)
      .get('/api/v1/access-events')
      .set('Authorization', bearer(admin));

    expect(history.body.total).toBe(1);
    expect(history.body.data[0]).toEqual({
      id: expect.any(String),
      ocorridoEm: expect.any(String),
      metodo: 'QR',
      resultado: 'AUTORIZADO',
      motivo: null,
      distanciaM: expect.any(Number),
      authorizationId: authorization.id,
      usuario: { id: maria.id, nome: 'Maria Souza', perfil: 'VISITANTE' },
      local: {
        id: accessPoint.id,
        nome: 'Catraca Social',
        tipo: 'CATRACA',
        edificio: { id: accessPoint.buildingId, nome: expect.any(String) },
      },
      terminal: { id: terminal.id, nome: 'Terminal Social' },
    });
    expect(history.body.data[0].distanciaM).toBeGreaterThan(0);
    expect(history.body.data[0].distanciaM).toBeLessThan(100);
  });

  it('um QR que não existe aparece com a pessoa logada, mas sem local nem terminal', async () => {
    const { admin, maria } = await seedQrScene();

    const denied = await validate(maria, `ACS1:${newToken()}`);
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('CREDENCIAL_INVALIDA');

    const history = await request(app)
      .get('/api/v1/access-events')
      .set('Authorization', bearer(admin));
    const mine = await request(app)
      .get('/api/v1/me/access-events')
      .set('Authorization', bearer(maria));

    expect(history.body.data).toEqual([
      expect.objectContaining({
        metodo: 'QR',
        resultado: 'NEGADO',
        motivo: 'CREDENCIAL_INVALIDA',
        distanciaM: null,
        authorizationId: null,
        usuario: { id: maria.id, nome: 'Maria Souza', perfil: 'VISITANTE' },
        local: null,
        terminal: null,
      }),
    ]);
    // The attempt belongs to the person who made it, so it is in their own history too.
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0]).toMatchObject({ motivo: 'CREDENCIAL_INVALIDA', local: null });
  });
});
