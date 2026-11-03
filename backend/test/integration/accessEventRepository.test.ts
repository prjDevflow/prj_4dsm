import { beforeEach, describe, expect, it } from 'vitest';
import { AccessEvent } from '../../src/entities/AccessEvent';
import { PrismaAccessEventRepository } from '../../src/infra/repositories/PrismaAccessEventRepository';
import {
  expectViolation,
  insertAccessPoint,
  insertAuthorization,
  insertTerminal,
  insertUser,
  newId,
  prisma,
  resetDatabase,
} from './helpers';

const events = new PrismaAccessEventRepository(prisma);

const T0 = new Date('2026-10-20T14:32:07.123Z');

describe('PrismaAccessEventRepository', () => {
  beforeEach(resetDatabase);

  describe('append', () => {
    it('grava um evento AUTORIZADO com todos os campos', async () => {
      const accessPoint = await insertAccessPoint();
      const terminal = await insertTerminal({ accessPointId: accessPoint.id });
      const user = await insertUser();
      const authorization = await insertAuthorization({
        usuarioId: user.id,
        accessPointId: accessPoint.id,
      });
      const event = AccessEvent.approved({
        id: newId(),
        ocorridoEm: T0,
        metodo: 'QR',
        terminalId: terminal.id,
        accessPointId: accessPoint.id,
        usuarioId: user.id,
        authorizationId: authorization.id,
        distanciaM: 14.25,
        precisaoMetros: 12.5,
      });

      await events.append(event);

      const row = await prisma.accessEvent.findUniqueOrThrow({ where: { id: event.id } });
      expect(row).toEqual(event);
      expect(row.detalhes).toEqual({ precisaoMetros: 12.5 });
    });

    it('grava a negação de uma credencial desconhecida sem terminal nem ponto, só com o prefixo do hash', async () => {
      const user = await insertUser();
      const hash = 'abcdef0123456789'.repeat(4);
      const event = AccessEvent.denied({
        id: newId(),
        ocorridoEm: T0,
        metodo: 'QR',
        usuarioId: user.id,
        motivo: 'CREDENCIAL_INVALIDA',
        credencialHash: hash,
      });

      await events.append(event);

      const row = await prisma.accessEvent.findUniqueOrThrow({ where: { id: event.id } });
      expect(row).toMatchObject({
        resultado: 'NEGADO',
        motivo: 'CREDENCIAL_INVALIDA',
        terminalId: null,
        accessPointId: null,
        authorizationId: null,
        usuarioId: user.id,
        detalhes: { credencialHashPrefixo: 'abcdef01' },
      });
      expect(JSON.stringify(row)).not.toContain(hash);
    });

    it('grava detalhes nulo como NULL do banco, não como o JSON null', async () => {
      const event = AccessEvent.denied({
        id: newId(),
        ocorridoEm: T0,
        metodo: 'NFC',
        motivo: 'TAG_DESCONHECIDA',
      });

      await events.append(event);

      const [raw] = await prisma.$queryRaw<{ isNull: boolean }[]>`
        SELECT detalhes IS NULL AS "isNull" FROM access_events WHERE id = ${event.id}::uuid`;
      expect(raw?.isNull).toBe(true);
    });

    it('recusa o evento de um terminal que não existe e não grava nada', async () => {
      const event = AccessEvent.denied({
        id: newId(),
        ocorridoEm: T0,
        metodo: 'QR',
        terminalId: newId(),
        motivo: 'DISTANTE_DO_TERMINAL',
      });

      await expectViolation(events.append(event), 'access_events_terminalId_fkey');

      expect(await prisma.accessEvent.count()).toBe(0);
    });

    it('roda dentro de uma transação: um erro depois do append desfaz a gravação', async () => {
      const event = AccessEvent.denied({
        id: newId(),
        ocorridoEm: T0,
        metodo: 'QR',
        motivo: 'CREDENCIAL_EXPIRADA',
      });

      await expect(
        prisma.$transaction(async (tx) => {
          await new PrismaAccessEventRepository(tx).append(event);
          throw new Error('falha depois do evento');
        }),
      ).rejects.toThrow('falha depois do evento');

      expect(await prisma.accessEvent.count()).toBe(0);
    });

    it('roda dentro de uma transação: o append que falha desfaz a escrita anterior', async () => {
      const user = await insertUser();
      const valid = AccessEvent.denied({
        id: newId(),
        ocorridoEm: T0,
        metodo: 'QR',
        usuarioId: user.id,
        motivo: 'CREDENCIAL_EXPIRADA',
      });
      const invalid = AccessEvent.denied({
        id: newId(),
        ocorridoEm: T0,
        metodo: 'QR',
        terminalId: newId(),
        motivo: 'DISTANTE_DO_TERMINAL',
      });

      await expectViolation(
        prisma.$transaction(async (tx) => {
          const inTransaction = new PrismaAccessEventRepository(tx);
          await inTransaction.append(valid);
          await inTransaction.append(invalid);
        }),
        'access_events_terminalId_fkey',
      );

      expect(await prisma.accessEvent.count()).toBe(0);
    });
  });
});
