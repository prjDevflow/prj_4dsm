import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import type { Prisma } from '../../src/generated/prisma/client';
import {
  bearer,
  insertAccessPoint,
  insertAuthorization,
  insertBuilding,
  insertTerminal,
  insertUser,
  prisma,
  resetDatabase,
} from './helpers';

const app = createApp();

type Actor = Parameters<typeof bearer>[0];

const T = new Date('2026-10-20T14:00:00.000Z');
const minutesAfter = (minutes: number) => new Date(T.getTime() + minutes * 60_000);

async function scenario() {
  const admin = await insertUser({ nome: 'Admin', perfil: 'ADMIN' });
  const maria = await insertUser({ nome: 'Maria Souza', perfil: 'VISITANTE' });
  const joao = await insertUser({ nome: 'João Alves', perfil: 'CONDOMINO' });
  const building = await insertBuilding({ nome: 'Edifício Central' });
  const gate = await insertAccessPoint({ buildingId: building.id, nome: 'Catraca Social' });
  const door = await insertAccessPoint({
    buildingId: building.id,
    nome: 'Porta do Bloco A',
    tipo: 'PORTA',
  });
  const gateTerminal = await insertTerminal({ accessPointId: gate.id, nome: 'Terminal Social' });
  const doorTerminal = await insertTerminal({ accessPointId: door.id, nome: 'Terminal da Porta' });
  // By default: Maria went through the gate by QR and was approved at `T`.
  const add = (overrides: Partial<Prisma.AccessEventUncheckedCreateInput> = {}) =>
    prisma.accessEvent.create({
      data: {
        ocorridoEm: T,
        metodo: 'QR',
        resultado: 'AUTORIZADO',
        usuarioId: maria.id,
        accessPointId: gate.id,
        terminalId: gateTerminal.id,
        ...overrides,
      },
    });
  return { admin, maria, joao, building, gate, door, gateTerminal, doorTerminal, add };
}

const list = (actor: Actor, query = '') =>
  request(app).get(`/api/v1/access-events${query}`).set('Authorization', bearer(actor));

const idsOf = (body: { data: Array<{ id: string }> }) => body.data.map((item) => item.id);

describe('GET /access-events', () => {
  beforeEach(resetDatabase);

  it('401 sem token', async () => {
    const res = await request(app).get('/api/v1/access-events');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it.each(['VISITANTE', 'CONDOMINO'] as const)('403 para o perfil %s', async (perfil) => {
    await scenario();
    const user = await insertUser({ perfil });

    const res = await list(user);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('200 com a página, o objeto completo e os mais recentes primeiro', async () => {
    const { admin, maria, joao, building, gate, door, gateTerminal, doorTerminal, add } =
      await scenario();
    const authorization = await insertAuthorization({
      usuarioId: maria.id,
      accessPointId: gate.id,
      criadoPorId: admin.id,
    });
    const older = await add({ ocorridoEm: T, authorizationId: authorization.id, distanciaM: 42.5 });
    const newer = await add({
      ocorridoEm: minutesAfter(5),
      usuarioId: joao.id,
      accessPointId: door.id,
      terminalId: doorTerminal.id,
      metodo: 'NFC',
      resultado: 'NEGADO',
      motivo: 'FORA_DO_PERIODO',
    });

    const res = await list(admin);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, pageSize: 20, total: 2 });
    expect(idsOf(res.body)).toEqual([newer.id, older.id]);
    expect(res.body.data[1]).toEqual({
      id: older.id,
      ocorridoEm: '2026-10-20T14:00:00.000Z',
      metodo: 'QR',
      resultado: 'AUTORIZADO',
      motivo: null,
      distanciaM: 42.5,
      authorizationId: authorization.id,
      usuario: { id: maria.id, nome: 'Maria Souza', perfil: 'VISITANTE' },
      local: {
        id: gate.id,
        nome: 'Catraca Social',
        tipo: 'CATRACA',
        edificio: { id: building.id, nome: 'Edifício Central' },
      },
      terminal: { id: gateTerminal.id, nome: 'Terminal Social' },
    });
    expect(res.body.data[0]).toMatchObject({
      metodo: 'NFC',
      resultado: 'NEGADO',
      motivo: 'FORA_DO_PERIODO',
      distanciaM: null,
      authorizationId: null,
      usuario: { nome: 'João Alves' },
      local: { nome: 'Porta do Bloco A', tipo: 'PORTA' },
    });
  });

  it('eventos aprovados e negados aparecem; os negados trazem o motivo', async () => {
    const { admin, add } = await scenario();
    const approved = await add({ ocorridoEm: T });
    const denied = await add({
      ocorridoEm: minutesAfter(1),
      resultado: 'NEGADO',
      motivo: 'DISTANTE_DO_TERMINAL',
      distanciaM: 150,
    });

    const res = await list(admin);

    expect(res.body.data).toEqual([
      expect.objectContaining({
        id: denied.id,
        resultado: 'NEGADO',
        motivo: 'DISTANTE_DO_TERMINAL',
      }),
      expect.objectContaining({ id: approved.id, resultado: 'AUTORIZADO', motivo: null }),
    ]);
  });

  it('evento sem pessoa, ponto ou terminal traz esses campos nulos', async () => {
    const { admin, add, gate, gateTerminal } = await scenario();
    // An unknown QR credential: nobody was identified and no terminal was reached.
    const unknownQr = await add({
      ocorridoEm: T,
      usuarioId: null,
      accessPointId: null,
      terminalId: null,
      resultado: 'NEGADO',
      motivo: 'CREDENCIAL_INVALIDA',
    });
    // An unknown tag: the terminal is known, the person is not.
    const unknownTag = await add({
      ocorridoEm: minutesAfter(1),
      usuarioId: null,
      metodo: 'NFC',
      resultado: 'NEGADO',
      motivo: 'TAG_DESCONHECIDA',
    });

    const res = await list(admin);

    expect(res.body.data).toEqual([
      expect.objectContaining({
        id: unknownTag.id,
        usuario: null,
        local: expect.objectContaining({ id: gate.id }),
        terminal: { id: gateTerminal.id, nome: 'Terminal Social' },
      }),
      expect.objectContaining({ id: unknownQr.id, usuario: null, local: null, terminal: null }),
    ]);
  });

  it('não expõe detalhes nem a chave de idempotência', async () => {
    const { admin, add } = await scenario();
    await add({
      metodo: 'NFC',
      clientEventId: '8d0f3f2e-6a5b-4c7e-9c1d-2b3a4f5e6d7c',
      detalhes: { uid: '04A1B2C3', credencialHashPrefixo: 'abcd1234', precisaoMetros: 12 },
    });

    const res = await list(admin);

    expect(Object.keys(res.body.data[0]).sort()).toEqual(
      [
        'authorizationId',
        'distanciaM',
        'id',
        'local',
        'metodo',
        'motivo',
        'ocorridoEm',
        'resultado',
        'terminal',
        'usuario',
      ].sort(),
    );
    expect(JSON.stringify(res.body)).not.toContain('04A1B2C3');
    expect(JSON.stringify(res.body)).not.toContain('8d0f3f2e');
  });

  it('pagina com page e pageSize e informa o total', async () => {
    const { admin, add } = await scenario();
    const oldest = await add({ ocorridoEm: minutesAfter(1) });
    const middle = await add({ ocorridoEm: minutesAfter(2) });
    const newest = await add({ ocorridoEm: minutesAfter(3) });

    const first = await list(admin, '?pageSize=2');
    const second = await list(admin, '?page=2&pageSize=2');

    expect(first.body).toMatchObject({ page: 1, pageSize: 2, total: 3 });
    expect(idsOf(first.body)).toEqual([newest.id, middle.id]);
    expect(second.body).toMatchObject({ page: 2, pageSize: 2, total: 3 });
    expect(idsOf(second.body)).toEqual([oldest.id]);
  });
});
