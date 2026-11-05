import { beforeEach, describe, expect, it } from 'vitest';
import type { NewTerminalCommand } from '../../src/entities/TerminalCommand';
import { PrismaTerminalCommandRepository } from '../../src/infra/repositories/PrismaTerminalCommandRepository';
import { makeNewTerminalCommand } from '../factories/makeTerminalCommand';
import { insertTerminal, insertTerminalCommand, prisma, resetDatabase } from './helpers';

const commands = new PrismaTerminalCommandRepository(prisma);

const T0 = new Date('2026-10-20T14:00:00.000Z');
const at = (ms: number) => new Date(T0.getTime() + ms);

const newCommand = (terminalId: string, overrides: Partial<NewTerminalCommand> = {}) =>
  makeNewTerminalCommand({ terminalId, ...overrides });

const stored = (id: number) => prisma.terminalCommand.findUniqueOrThrow({ where: { id } });
const ids = (list: { id: number }[]) => list.map((command) => command.id);

describe('PrismaTerminalCommandRepository', () => {
  beforeEach(resetDatabase);

  describe('create', () => {
    it('grava o comando ABRIR e devolve o id inteiro gerado, sem entrega nem execução', async () => {
      const terminal = await insertTerminal();

      const created = await commands.create(newCommand(terminal.id));

      expect(Number.isInteger(created.id)).toBe(true);
      expect(created).toEqual({
        id: created.id,
        terminalId: terminal.id,
        tipo: 'ABRIR',
        motivo: null,
        aberturaMs: 5000,
        criadoEm: T0,
        expiraEm: at(10_000),
        entregueEm: null,
        executadoEm: null,
      });
      expect(await stored(created.id)).toEqual(created);
    });

    it('grava o comando NEGAR com o motivo e sem aberturaMs', async () => {
      const terminal = await insertTerminal();

      const created = await commands.create(
        newCommand(terminal.id, {
          tipo: 'NEGAR',
          motivo: 'DISTANTE_DO_TERMINAL',
          aberturaMs: null,
        }),
      );

      expect(await stored(created.id)).toMatchObject({
        tipo: 'NEGAR',
        motivo: 'DISTANTE_DO_TERMINAL',
        aberturaMs: null,
      });
    });

    it('gera ids crescentes', async () => {
      const terminal = await insertTerminal();

      const first = await commands.create(newCommand(terminal.id));
      const second = await commands.create(newCommand(terminal.id));

      expect(second.id).toBeGreaterThan(first.id);
    });

    it('desfaz a gravação quando roda numa transação que falha', async () => {
      const terminal = await insertTerminal();

      await prisma
        .$transaction(async (tx) => {
          await new PrismaTerminalCommandRepository(tx).create(newCommand(terminal.id));
          throw new Error('falha depois do comando');
        })
        .catch(() => undefined);

      expect(await prisma.terminalCommand.count()).toBe(0);
    });
  });

  describe('listPending', () => {
    it('devolve os comandos do terminal em ordem crescente de id, com todos os campos', async () => {
      const terminal = await insertTerminal();
      const first = await commands.create(newCommand(terminal.id));
      const second = await commands.create(
        newCommand(terminal.id, { tipo: 'NEGAR', motivo: 'USOS_ESGOTADOS', aberturaMs: null }),
      );

      const result = await commands.listPending(terminal.id, 0, 10, T0);

      expect(result).toEqual([first, second]);
    });

    it('devolve só os comandos com id maior que after', async () => {
      const terminal = await insertTerminal();
      const first = await commands.create(newCommand(terminal.id));
      const second = await commands.create(newCommand(terminal.id));

      expect(ids(await commands.listPending(terminal.id, first.id, 10, T0))).toEqual([second.id]);
      expect(await commands.listPending(terminal.id, second.id, 10, T0)).toEqual([]);
    });

    it('respeita o limit e devolve os primeiros', async () => {
      const terminal = await insertTerminal();
      const created = [];
      for (let i = 0; i < 3; i += 1) created.push(await commands.create(newCommand(terminal.id)));

      const result = await commands.listPending(terminal.id, 0, 2, T0);

      expect(ids(result)).toEqual(ids(created.slice(0, 2)));
    });

    it('devolve o comando que vence exatamente agora e não devolve o vencido há 1 ms', async () => {
      const terminal = await insertTerminal();
      const created = await commands.create(newCommand(terminal.id));

      expect(ids(await commands.listPending(terminal.id, 0, 10, at(10_000)))).toEqual([created.id]);
      expect(await commands.listPending(terminal.id, 0, 10, at(10_001))).toEqual([]);
    });

    it('nunca devolve comandos de outro terminal', async () => {
      const terminal = await insertTerminal();
      const other = await insertTerminal();
      await commands.create(newCommand(other.id));
      const mine = await commands.create(newCommand(terminal.id));

      const result = await commands.listPending(terminal.id, 0, 10, T0);

      expect(ids(result)).toEqual([mine.id]);
    });

    it('devolve também o comando já entregue e ainda válido', async () => {
      const terminal = await insertTerminal();
      const delivered = await insertTerminalCommand({ terminalId: terminal.id, entregueEm: T0 });

      const result = await commands.listPending(terminal.id, 0, 10, T0);

      expect(ids(result)).toEqual([delivered.id]);
    });
  });

  describe('markDelivered', () => {
    it('grava entregueEm só nos ids pedidos', async () => {
      const terminal = await insertTerminal();
      const a = await commands.create(newCommand(terminal.id));
      const b = await commands.create(newCommand(terminal.id));

      await commands.markDelivered([a.id], at(1000));

      expect((await stored(a.id)).entregueEm).toEqual(at(1000));
      expect((await stored(b.id)).entregueEm).toBeNull();
    });

    it('não sobrescreve a primeira entrega', async () => {
      const terminal = await insertTerminal();
      const created = await commands.create(newCommand(terminal.id));
      await commands.markDelivered([created.id], at(1000));

      await commands.markDelivered([created.id], at(5000));

      expect((await stored(created.id)).entregueEm).toEqual(at(1000));
    });

    it('não faz nada com a lista vazia', async () => {
      const terminal = await insertTerminal();
      const created = await commands.create(newCommand(terminal.id));

      await commands.markDelivered([], at(1000));

      expect((await stored(created.id)).entregueEm).toBeNull();
    });
  });

  describe('markExecuted', () => {
    it('grava executadoEm no comando do próprio terminal e devolve true', async () => {
      const terminal = await insertTerminal();
      const created = await commands.create(newCommand(terminal.id));

      expect(await commands.markExecuted(terminal.id, created.id, at(2000))).toBe(true);

      expect((await stored(created.id)).executadoEm).toEqual(at(2000));
    });

    it('devolve false e não grava nada para o comando de outro terminal ou inexistente', async () => {
      const terminal = await insertTerminal();
      const other = await insertTerminal();
      const created = await commands.create(newCommand(other.id));

      expect(await commands.markExecuted(terminal.id, created.id, at(2000))).toBe(false);
      expect(await commands.markExecuted(terminal.id, created.id + 100, at(2000))).toBe(false);

      expect((await stored(created.id)).executadoEm).toBeNull();
    });

    it('devolve true e preserva o primeiro executadoEm quando o ack se repete', async () => {
      const terminal = await insertTerminal();
      const created = await commands.create(newCommand(terminal.id));
      await commands.markExecuted(terminal.id, created.id, at(2000));

      expect(await commands.markExecuted(terminal.id, created.id, at(9000))).toBe(true);

      expect((await stored(created.id)).executadoEm).toEqual(at(2000));
    });
  });

  describe('deleteExpiredBefore', () => {
    /** A command that expires `ms` after T0, created 10 s earlier (the CHECK wants `criadoEm` < `expiraEm`). */
    const expiringAt = (terminalId: string, ms: number) =>
      newCommand(terminalId, { criadoEm: at(ms - 10_000), expiraEm: at(ms) });

    it('apaga só os comandos com expiraEm antes do corte, e mantém o que vence exatamente nele', async () => {
      const terminal = await insertTerminal();
      const old = await commands.create(expiringAt(terminal.id, -1));
      const atCutoff = await commands.create(expiringAt(terminal.id, 0));
      const later = await commands.create(expiringAt(terminal.id, 1));

      const deleted = await commands.deleteExpiredBefore(T0);

      expect(deleted).toBe(1);
      const left = await prisma.terminalCommand.findMany({ orderBy: { id: 'asc' } });
      expect(ids(left)).toEqual([atCutoff.id, later.id]);
      expect(ids(left)).not.toContain(old.id);
    });

    it('apaga os vencidos de todos os terminais, entregues ou executados, e devolve a contagem', async () => {
      const first = await insertTerminal();
      const second = await insertTerminal();
      const a = await commands.create(expiringAt(first.id, -5000));
      const b = await commands.create(expiringAt(second.id, -5000));
      await commands.markDelivered([a.id], at(-9000));
      await commands.markExecuted(first.id, a.id, at(-8000));
      const valid = await commands.create(newCommand(second.id));

      const deleted = await commands.deleteExpiredBefore(T0);

      expect(deleted).toBe(2);
      expect(await stored(valid.id)).toBeTruthy();
      expect(await prisma.terminalCommand.count({ where: { id: { in: [a.id, b.id] } } })).toBe(0);
    });

    it('não reaproveita ids: o comando criado depois da limpeza tem id maior e o after continua valendo', async () => {
      const terminal = await insertTerminal();
      const last = await commands.create(expiringAt(terminal.id, -1));
      await commands.deleteExpiredBefore(T0);

      const next = await commands.create(newCommand(terminal.id));

      expect(next.id).toBeGreaterThan(last.id);
      expect(ids(await commands.listPending(terminal.id, last.id, 10, T0))).toEqual([next.id]);
    });
  });
});
