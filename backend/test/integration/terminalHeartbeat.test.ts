import { createHash } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import { bearer, insertTerminal, insertUser, prisma, resetDatabase } from './helpers';

const app = createApp();

const KEY = 'chave-de-teste-do-terminal-0123456789abcdef';
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

const body = (overrides: Record<string, unknown> = {}) => ({
  latitude: -23.30512,
  longitude: -45.96551,
  gpsFix: true,
  gpsSimulado: false,
  firmware: '0.3.0',
  uptimeS: 1234,
  wifiRssi: -61,
  eventosPendentes: 0,
  ...overrides,
});

const heartbeat = (terminalId: string, payload: object = body(), key: string = KEY) =>
  request(app)
    .post('/api/v1/terminal/heartbeat')
    .set({ 'X-Terminal-Id': terminalId, 'X-Terminal-Key': key })
    .send(payload);

const storedTerminal = (id: string) => prisma.terminal.findUniqueOrThrow({ where: { id } });

describe('POST /api/v1/terminal/heartbeat', () => {
  beforeEach(resetDatabase);

  it('200 com serverTime em UTC (ao segundo) e o bloco config do ambiente', async () => {
    const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });
    const before = Date.now();

    const res = await heartbeat(terminal.id);

    expect(res.status).toBe(200);
    expect(res.body.serverTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(Math.abs(Date.parse(res.body.serverTime) - before)).toBeLessThan(5000);
    expect(res.body.config).toEqual({ qrRefreshMs: 10000, commandPollMs: 1000, aberturaMs: 5000 });
  });

  it('grava contato, posição, GPS, firmware e rssi (wifiRssi) no terminal', async () => {
    const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });
    const before = Date.now();

    await heartbeat(terminal.id, body({ gpsSimulado: true, firmware: '0.4.1', wifiRssi: -72 }));

    const row = await storedTerminal(terminal.id);
    expect(row).toMatchObject({
      ultimaLat: -23.30512,
      ultimaLon: -45.96551,
      gpsFix: true,
      gpsSimulado: true,
      firmware: '0.4.1',
      rssi: -72,
    });
    expect(Math.abs(row.ultimoContatoEm!.getTime() - before)).toBeLessThan(5000);
  });

  it('com gpsFix falso ignora latitude e longitude e mantém a posição anterior', async () => {
    const terminal = await insertTerminal({
      apiKeyHash: sha256(KEY),
      ultimaLat: -23.1,
      ultimaLon: -45.1,
    });

    const res = await heartbeat(
      terminal.id,
      body({ gpsFix: false, latitude: -10, longitude: -20 }),
    );

    expect(res.status).toBe(200);
    expect(await storedTerminal(terminal.id)).toMatchObject({
      gpsFix: false,
      ultimaLat: -23.1,
      ultimaLon: -45.1,
    });
  });

  it('200 sem posição quando não há fix e o terminal não manda latitude nem longitude', async () => {
    const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });

    const res = await heartbeat(terminal.id, {
      gpsFix: false,
      firmware: '0.3.0',
    });

    expect(res.status).toBe(200);
    expect(await storedTerminal(terminal.id)).toMatchObject({
      gpsFix: false,
      gpsSimulado: false,
      rssi: null,
      ultimaLat: null,
      ultimaLon: null,
    });
  });

  it('401 UNAUTHORIZED com chave errada, sem cabeçalhos ou só com um token de usuário', async () => {
    const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });
    const admin = await insertUser({ perfil: 'ADMIN' });

    const wrongKey = await heartbeat(terminal.id, body(), 'outra-chave');
    const noHeaders = await request(app).post('/api/v1/terminal/heartbeat').send(body());
    const userToken = await request(app)
      .post('/api/v1/terminal/heartbeat')
      .set('Authorization', bearer(admin))
      .send(body());

    for (const res of [wrongKey, noHeaders, userToken]) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    }
    expect((await storedTerminal(terminal.id)).ultimoContatoEm).toBeNull();
  });

  it('403 FORBIDDEN para terminal inativo com a chave certa, sem gravar o contato', async () => {
    const terminal = await insertTerminal({ apiKeyHash: sha256(KEY), ativo: false });

    const res = await heartbeat(terminal.id);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect((await storedTerminal(terminal.id)).ultimoContatoEm).toBeNull();
  });

  describe('422 VALIDATION_ERROR', () => {
    it.each([
      ['latitude acima de 90', { latitude: 90.0001 }, 'latitude'],
      ['latitude abaixo de -90', { latitude: -91 }, 'latitude'],
      ['longitude acima de 180', { longitude: 181 }, 'longitude'],
      ['longitude abaixo de -180', { longitude: -180.5 }, 'longitude'],
      ['latitude em texto', { latitude: '-23.3' }, 'latitude'],
      ['gpsFix ausente', { gpsFix: undefined }, 'gpsFix'],
      ['gpsFix em texto', { gpsFix: 'true' }, 'gpsFix'],
      ['firmware ausente', { firmware: undefined }, 'firmware'],
      ['firmware com mais de 40 caracteres', { firmware: 'x'.repeat(41) }, 'firmware'],
      ['wifiRssi positivo', { wifiRssi: 1 }, 'wifiRssi'],
      ['wifiRssi decimal', { wifiRssi: -60.5 }, 'wifiRssi'],
      ['uptimeS negativo', { uptimeS: -1 }, 'uptimeS'],
      ['eventosPendentes decimal', { eventosPendentes: 1.5 }, 'eventosPendentes'],
    ])('%s', async (_name, overrides, field) => {
      const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });

      const res = await heartbeat(terminal.id, body(overrides));

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
      expect((await storedTerminal(terminal.id)).ultimoContatoEm).toBeNull();
    });

    it('com gpsFix verdadeiro, latitude e longitude são obrigatórias', async () => {
      const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });

      const res = await heartbeat(terminal.id, { gpsFix: true, firmware: '0.3.0' });

      expect(res.status).toBe(422);
      expect(res.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual([
        'latitude',
        'longitude',
      ]);
    });

    it('aceita os limites exatos das coordenadas', async () => {
      const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });

      const res = await heartbeat(terminal.id, body({ latitude: -90, longitude: 180 }));

      expect(res.status).toBe(200);
    });
  });

  describe('limite de um heartbeat a cada 2 s', () => {
    it('429 RATE_LIMITED no segundo heartbeat em seguida, sem mexer no contato nem no firmware', async () => {
      const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });
      const first = await heartbeat(terminal.id, body({ firmware: '0.3.0' }));
      const contact = (await storedTerminal(terminal.id)).ultimoContatoEm;

      const second = await heartbeat(terminal.id, body({ firmware: '9.9.9' }));

      expect(first.status).toBe(200);
      expect(second.status).toBe(429);
      expect(second.body.error.code).toBe('RATE_LIMITED');
      expect(typeof second.body.error.message).toBe('string');
      expect(await storedTerminal(terminal.id)).toMatchObject({
        ultimoContatoEm: contact,
        firmware: '0.3.0',
      });
    });

    it('200 de novo quando o último contato tem mais de 2 s', async () => {
      const terminal = await insertTerminal({
        apiKeyHash: sha256(KEY),
        ultimoContatoEm: new Date(Date.now() - 2500),
      });

      const res = await heartbeat(terminal.id);

      expect(res.status).toBe(200);
    });

    it('o limite é por terminal: outro terminal não é barrado', async () => {
      const first = await insertTerminal({ apiKeyHash: sha256(KEY) });
      const second = await insertTerminal({ apiKeyHash: sha256(KEY) });
      await heartbeat(first.id);

      const res = await heartbeat(second.id);

      expect(res.status).toBe(200);
    });

    it('de oito heartbeats simultâneos, só um é aceito e os outros dão 429', async () => {
      const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });

      const responses = await Promise.all(Array.from({ length: 8 }, () => heartbeat(terminal.id)));

      const statuses = responses.map((res) => res.status).sort();
      expect(statuses).toEqual([200, 429, 429, 429, 429, 429, 429, 429]);
    });
  });

  describe('efeito em GET /terminals', () => {
    const listTerminals = async () => {
      const admin = await insertUser({ perfil: 'ADMIN' });
      return request(app).get('/api/v1/terminals').set('Authorization', bearer(admin));
    };

    it('depois de um heartbeat o terminal aparece online com a posição e a hora do contato', async () => {
      const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });
      await heartbeat(terminal.id, body({ firmware: '0.4.1', wifiRssi: -55 }));
      const contact = (await storedTerminal(terminal.id)).ultimoContatoEm!;

      const res = await listTerminals();

      expect(res.status).toBe(200);
      expect(res.body.data[0]).toMatchObject({
        id: terminal.id,
        online: true,
        ultimoContatoEm: contact.toISOString(),
        ultimaLat: -23.30512,
        ultimaLon: -45.96551,
        gpsFix: true,
        firmware: '0.4.1',
        rssi: -55,
      });
    });

    it('sem heartbeat há mais de 30 s o terminal aparece offline', async () => {
      await insertTerminal({
        apiKeyHash: sha256(KEY),
        ultimoContatoEm: new Date(Date.now() - 31_000),
      });

      const res = await listTerminals();

      expect(res.body.data[0].online).toBe(false);
    });
  });
});
