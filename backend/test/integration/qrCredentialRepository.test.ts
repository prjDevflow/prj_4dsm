import { beforeEach, describe, expect, it } from 'vitest';
import type { QrCredential } from '../../src/entities/QrCredential';
import { PrismaQrCredentialRepository } from '../../src/infra/repositories/PrismaQrCredentialRepository';
import { insertTerminal, newId, prisma, resetDatabase, sha256Hex } from './helpers';

const credentials = new PrismaQrCredentialRepository(prisma);

const T0 = new Date('2026-10-20T14:00:00.000Z');
const at = (ms: number) => new Date(T0.getTime() + ms);

/** A credential issued at `emitidoEm`, valid for 15 s; the hash is derived from `seed`. */
const credential = (terminalId: string, seed: string, emitidoEm = T0): QrCredential => ({
  id: newId(),
  terminalId,
  tokenHash: sha256Hex(seed),
  emitidoEm,
  expiraEm: new Date(emitidoEm.getTime() + 15_000),
  consumidoEm: null,
  consumidoPorId: null,
});

const count = () => prisma.qrCredential.count();

describe('PrismaQrCredentialRepository', () => {
  beforeEach(resetDatabase);

  describe('saveIfIdle', () => {
    it('grava a primeira credencial do terminal com todos os campos e devolve true', async () => {
      const terminal = await insertTerminal();
      const item = credential(terminal.id, 'a');

      expect(await credentials.saveIfIdle(item, at(-5000))).toBe(true);

      const row = await prisma.qrCredential.findUniqueOrThrow({ where: { id: item.id } });
      expect(row).toEqual(item);
    });

    it('não grava e devolve false quando o terminal emitiu depois do limite', async () => {
      const terminal = await insertTerminal();
      await credentials.saveIfIdle(credential(terminal.id, 'a'), at(-5000));

      const second = credential(terminal.id, 'b', at(4999));
      // The previous issue (T0) is after `previousIssueUntil` (T0 - 1 ms).
      expect(await credentials.saveIfIdle(second, at(-1))).toBe(false);

      expect(await count()).toBe(1);
    });

    it('grava quando a última emissão está exatamente no limite', async () => {
      const terminal = await insertTerminal();
      await credentials.saveIfIdle(credential(terminal.id, 'a'), at(-5000));

      expect(await credentials.saveIfIdle(credential(terminal.id, 'b', at(5000)), T0)).toBe(true);

      expect(await count()).toBe(2);
    });

    it('olha só o próprio terminal', async () => {
      const first = await insertTerminal();
      const second = await insertTerminal();
      await credentials.saveIfIdle(credential(first.id, 'a'), at(-5000));

      expect(await credentials.saveIfIdle(credential(second.id, 'b'), at(-5000))).toBe(true);
    });

    it('de vinte chamadas simultâneas para o mesmo terminal, só uma grava', async () => {
      const terminal = await insertTerminal();

      const results = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          credentials.saveIfIdle(credential(terminal.id, `s${i}`), at(-5000)),
        ),
      );

      expect(results.filter(Boolean)).toHaveLength(1);
      expect(await count()).toBe(1);
    });

    it('terminais diferentes não se bloqueiam em chamadas simultâneas', async () => {
      const terminals = await Promise.all(Array.from({ length: 5 }, () => insertTerminal()));

      const results = await Promise.all(
        terminals.map((t) => credentials.saveIfIdle(credential(t.id, t.id), at(-5000))),
      );

      expect(results).toEqual([true, true, true, true, true]);
    });
  });

  describe('findByTokenHash', () => {
    it('acha a credencial pelo hash e devolve null para um hash desconhecido', async () => {
      const terminal = await insertTerminal();
      const item = credential(terminal.id, 'a');
      await credentials.saveIfIdle(item, at(-5000));

      expect(await credentials.findByTokenHash(item.tokenHash)).toEqual(item);
      expect(await credentials.findByTokenHash(sha256Hex('desconhecido'))).toBeNull();
    });
  });

  describe('deleteExpiredBefore', () => {
    it('apaga só as que vencem antes do corte (a que vence exatamente no corte fica) e conta', async () => {
      const terminal = await insertTerminal();
      // Expire at T0+15 s, T0+16 s, T0+17 s.
      await credentials.saveIfIdle(credential(terminal.id, 'a', at(0)), at(-5000));
      await credentials.saveIfIdle(credential(terminal.id, 'b', at(1000)), at(-5000));
      await credentials.saveIfIdle(credential(terminal.id, 'c', at(2000)), at(-5000));

      const deleted = await credentials.deleteExpiredBefore(at(16_000));

      expect(deleted).toBe(1);
      const left = await prisma.qrCredential.findMany({ orderBy: { expiraEm: 'asc' } });
      expect(left.map((row) => row.tokenHash)).toEqual([sha256Hex('b'), sha256Hex('c')]);
    });

    it('devolve 0 quando não há nada vencido', async () => {
      expect(await credentials.deleteExpiredBefore(at(1_000_000))).toBe(0);
    });
  });
});
