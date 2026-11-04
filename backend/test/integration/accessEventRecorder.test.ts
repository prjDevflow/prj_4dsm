import { beforeEach, describe, expect, it } from 'vitest';
import { DENIAL_REASONS } from '../../src/entities/DenialReason';
import { PrismaAccessEventRepository } from '../../src/infra/repositories/PrismaAccessEventRepository';
import { container } from '../../src/main/container';
import { AccessEventRecorder } from '../../src/useCases/Events/AccessEventRecorder';
import { accessEventRecorder } from '../../src/useCases/Events';
import { SpyLogger } from '../doubles/SpyLogger';
import { insertAccessPoint, insertTerminal, insertUser, newId, prisma, resetDatabase } from './helpers';

describe('AccessEventRecorder com PostgreSQL', () => {
  beforeEach(resetDatabase);

  it('grava uma linha NEGADO por motivo do contrato, pela fiação real', async () => {
    const accessPoint = await insertAccessPoint();
    const terminal = await insertTerminal({ accessPointId: accessPoint.id });
    const user = await insertUser();

    for (const motivo of DENIAL_REASONS) {
      await accessEventRecorder.recordDenied({
        metodo: 'QR',
        motivo,
        terminalId: terminal.id,
        accessPointId: accessPoint.id,
        usuarioId: user.id,
      });
    }

    const rows = await prisma.accessEvent.findMany({ orderBy: { ocorridoEm: 'asc' } });
    expect(rows).toHaveLength(DENIAL_REASONS.length);
    expect(rows.map((row) => row.motivo).sort()).toEqual([...DENIAL_REASONS].sort());
    expect(rows.every((row) => row.resultado === 'NEGADO' && row.metodo === 'QR')).toBe(true);
  });

  it('não propaga a falha real de gravação, registra o erro com contexto e não deixa linha', async () => {
    const logger = new SpyLogger();
    const recorder = new AccessEventRecorder(
      new PrismaAccessEventRepository(prisma),
      container.ids,
      container.clock,
      logger,
    );
    const user = await insertUser();
    const missingTerminalId = newId();

    // A terminal that does not exist makes the foreign key reject the insert.
    await expect(
      recorder.recordDenied({
        metodo: 'QR',
        motivo: 'DISTANTE_DO_TERMINAL',
        terminalId: missingTerminalId,
        usuarioId: user.id,
      }),
    ).resolves.toBeUndefined();

    expect(await prisma.accessEvent.count()).toBe(0);
    const [entry] = logger.of('error');
    expect(logger.of('error')).toHaveLength(1);
    expect(entry?.meta).toMatchObject({
      motivo: 'DISTANTE_DO_TERMINAL',
      metodo: 'QR',
      terminalId: missingTerminalId,
      usuarioId: user.id,
    });
  });

  it('mantém o hash da credencial fora do log mesmo quando o erro vem do Prisma', async () => {
    const logger = new SpyLogger();
    const recorder = new AccessEventRecorder(
      new PrismaAccessEventRepository(prisma),
      container.ids,
      container.clock,
      logger,
    );
    const hash = 'fedcba9876543210'.repeat(4);

    await recorder.recordDenied({
      metodo: 'QR',
      motivo: 'CREDENCIAL_INVALIDA',
      terminalId: newId(),
      credencialHash: hash,
    });

    expect(logger.of('error')).toHaveLength(1);
    const logged = JSON.stringify(logger.entries);
    expect(logged).not.toContain(hash);
    expect(logged).not.toContain(hash.slice(0, 8));
  });
});
