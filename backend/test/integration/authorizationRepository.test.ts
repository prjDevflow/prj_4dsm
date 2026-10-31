import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaAuthorizationRepository } from '../../src/infra/repositories/PrismaAuthorizationRepository';
import type { AuthorizationListFilter } from '../../src/repositories/IAuthorizationRepository';
import {
  insertAccessPoint,
  insertAuthorization,
  insertBuilding,
  insertUser,
  prisma,
  resetDatabase,
} from './helpers';

const authorizations = new PrismaAuthorizationRepository(prisma);

const stored = (id: string) => prisma.authorization.findUniqueOrThrow({ where: { id } });

describe('PrismaAuthorizationRepository (B09)', () => {
  beforeEach(resetDatabase);

  describe('cancelIfActive', () => {
    it('cancela a autorização ATIVA e grava quem, quando e o motivo', async () => {
      const admin = await insertUser({ perfil: 'ADMIN' });
      const { id } = await insertAuthorization();
      const canceladoEm = new Date('2026-10-20T14:00:00Z');

      const changed = await authorizations.cancelIfActive({
        id,
        canceladoPorId: admin.id,
        canceladoEm,
        motivo: 'Pedido da moradora',
      });

      expect(changed).toBe(true);
      expect(await stored(id)).toMatchObject({
        situacao: 'CANCELADA',
        canceladoPorId: admin.id,
        canceladoEm,
        motivoCancelamento: 'Pedido da moradora',
      });
    });

    it('não altera uma autorização já cancelada e devolve false', async () => {
      const first = await insertUser({ perfil: 'ADMIN' });
      const second = await insertUser({ perfil: 'ADMIN' });
      const { id } = await insertAuthorization();
      const firstAt = new Date('2026-10-20T14:00:00Z');
      await authorizations.cancelIfActive({
        id,
        canceladoPorId: first.id,
        canceladoEm: firstAt,
        motivo: 'Primeiro',
      });

      const changed = await authorizations.cancelIfActive({
        id,
        canceladoPorId: second.id,
        canceladoEm: new Date('2026-10-21T14:00:00Z'),
        motivo: 'Segundo',
      });

      expect(changed).toBe(false);
      expect(await stored(id)).toMatchObject({
        canceladoPorId: first.id,
        canceladoEm: firstAt,
        motivoCancelamento: 'Primeiro',
      });
    });

    it('devolve false quando a autorização não existe', async () => {
      const admin = await insertUser({ perfil: 'ADMIN' });

      const changed = await authorizations.cancelIfActive({
        id: '00000000-0000-4000-8000-0000000000ff',
        canceladoPorId: admin.id,
        canceladoEm: new Date(),
        motivo: null,
      });

      expect(changed).toBe(false);
    });
  });

  describe('list', () => {
    // 2026-10-20 23:30 in São Paulo, already 2026-10-21 in UTC: "today" must be the São Paulo day.
    const NOW = new Date('2026-10-21T02:30:00Z');
    const list = (filter: Partial<AuthorizationListFilter> = {}) =>
      authorizations.list({ now: NOW, sort: 'recent', page: 1, pageSize: 100, ...filter });
    const idsOf = async (filter: Partial<AuthorizationListFilter> = {}) =>
      (await list(filter)).items.map((item) => item.authorization.id).sort();

    it('separa as quatro situações efetivas na consulta, com a precedência do contrato', async () => {
      const usuario = await insertUser();
      const base = { usuarioId: usuario.id };
      const lastDay = await insertAuthorization({ ...base, dataFim: new Date('2026-10-20') });
      const lastDaySpent = await insertAuthorization({
        ...base,
        dataFim: new Date('2026-10-20'),
        usosRealizados: 3,
      });
      const past = await insertAuthorization({ ...base, dataFim: new Date('2026-10-19') });
      const pastSpent = await insertAuthorization({
        ...base,
        dataFim: new Date('2026-10-19'),
        usosRealizados: 3,
      });
      const cancelledPast = await insertAuthorization({
        ...base,
        dataFim: new Date('2026-10-19'),
        situacao: 'CANCELADA',
      });
      const cancelledFuture = await insertAuthorization({
        ...base,
        dataFim: new Date('2099-01-01'),
        situacao: 'CANCELADA',
      });
      const partlyUsed = await insertAuthorization({
        ...base,
        dataFim: new Date('2099-01-01'),
        usosRealizados: 2,
      });

      expect(await idsOf({ situacao: 'ATIVA' })).toEqual([lastDay.id, partlyUsed.id].sort());
      expect(await idsOf({ situacao: 'ESGOTADA' })).toEqual([lastDaySpent.id]);
      expect(await idsOf({ situacao: 'EXPIRADA' })).toEqual([past.id, pastSpent.id].sort());
      expect(await idsOf({ situacao: 'CANCELADA' })).toEqual(
        [cancelledPast.id, cancelledFuture.id].sort(),
      );
      expect((await list()).total).toBe(7);
    });

    it('filtra por usuário e por ponto de acesso', async () => {
      const maria = await insertUser({ nome: 'Maria' });
      const joao = await insertUser({ nome: 'João' });
      const building = await insertBuilding();
      const gate = await insertAccessPoint({ buildingId: building.id });
      const door = await insertAccessPoint({ buildingId: building.id });
      const mariaGate = await insertAuthorization({ usuarioId: maria.id, accessPointId: gate.id });
      const mariaDoor = await insertAuthorization({ usuarioId: maria.id, accessPointId: door.id });
      const joaoGate = await insertAuthorization({ usuarioId: joao.id, accessPointId: gate.id });

      expect(await idsOf({ usuarioId: maria.id })).toEqual([mariaGate.id, mariaDoor.id].sort());
      expect(await idsOf({ accessPointId: gate.id })).toEqual([mariaGate.id, joaoGate.id].sort());
      expect(await idsOf({ usuarioId: maria.id, accessPointId: gate.id })).toEqual([mariaGate.id]);
    });

    it('mantém quem tem o período sobreposto ao intervalo, com as pontas incluídas', async () => {
      const period = (dataInicio: string, dataFim: string) =>
        insertAuthorization({ dataInicio: new Date(dataInicio), dataFim: new Date(dataFim) });
      const endsOnFrom = await period('2026-10-01', '2026-10-10');
      const endsBeforeFrom = await period('2026-10-01', '2026-10-09');
      const startsOnTo = await period('2026-10-20', '2026-10-30');
      const startsAfterTo = await period('2026-10-21', '2026-10-30');
      const inside = await period('2026-10-12', '2026-10-15');

      expect(await idsOf({ dataDe: '2026-10-10', dataAte: '2026-10-20' })).toEqual(
        [endsOnFrom.id, startsOnTo.id, inside.id].sort(),
      );
      expect(await idsOf({ dataDe: '2026-10-10' })).toEqual(
        [endsOnFrom.id, startsOnTo.id, startsAfterTo.id, inside.id].sort(),
      );
      expect(await idsOf({ dataAte: '2026-10-20' })).toEqual(
        [endsOnFrom.id, endsBeforeFrom.id, startsOnTo.id, inside.id].sort(),
      );
    });

    it('ordena pelos mais recentes ou pelo fim do período, desempata por id e pagina com o total', async () => {
      const a = await insertAuthorization({
        id: '00000000-0000-4000-8000-00000000000a',
        criadoEm: new Date('2026-10-01T10:00:00Z'),
        dataFim: new Date('2026-10-25'),
      });
      const b = await insertAuthorization({
        id: '00000000-0000-4000-8000-00000000000b',
        criadoEm: new Date('2026-10-02T10:00:00Z'),
        dataFim: new Date('2026-10-25'),
      });
      const c = await insertAuthorization({
        id: '00000000-0000-4000-8000-00000000000c',
        criadoEm: new Date('2026-10-02T10:00:00Z'),
        dataFim: new Date('2026-10-20'),
      });
      const ids = async (filter: Partial<AuthorizationListFilter>) =>
        (await list(filter)).items.map((item) => item.authorization.id);

      expect(await ids({ sort: 'recent' })).toEqual([c.id, b.id, a.id]);
      expect(await ids({ sort: 'dataFim' })).toEqual([c.id, a.id, b.id]);
      const second = await list({ sort: 'recent', page: 2, pageSize: 2 });
      expect(second.items.map((item) => item.authorization.id)).toEqual([a.id]);
      expect(second.total).toBe(3);
    });

    it('resolve usuário, local, edifício e quem criou', async () => {
      const admin = await insertUser({ nome: 'Admin', perfil: 'ADMIN' });
      const usuario = await insertUser({ nome: 'Maria Souza', perfil: 'VISITANTE' });
      const building = await insertBuilding({ nome: 'Edifício Central' });
      const point = await insertAccessPoint({
        buildingId: building.id,
        nome: 'Catraca Social',
        tipo: 'CATRACA',
      });
      await insertAuthorization({
        usuarioId: usuario.id,
        accessPointId: point.id,
        criadoPorId: admin.id,
      });

      const { items } = await list();

      expect(items[0]).toMatchObject({
        usuario: { id: usuario.id, nome: 'Maria Souza', perfil: 'VISITANTE' },
        local: {
          id: point.id,
          nome: 'Catraca Social',
          tipo: 'CATRACA',
          edificio: { id: building.id, nome: 'Edifício Central' },
        },
        criadoPor: { id: admin.id, nome: 'Admin' },
        canceladoPor: null,
      });
    });
  });
});
