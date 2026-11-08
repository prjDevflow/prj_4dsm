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
