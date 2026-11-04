import { describe, expect, it } from 'vitest';
import { DENIAL_REASONS } from '../../entities/DenialReason';
import { FakeClock } from '../../../test/doubles/FakeClock';
import { InMemoryAccessEventRepository } from '../../../test/doubles/InMemoryAccessEventRepository';
import { SequentialIdGenerator } from '../../../test/doubles/SequentialIdGenerator';
import { SpyLogger } from '../../../test/doubles/SpyLogger';
import { AccessEventRecorder } from './AccessEventRecorder';

const TERMINAL_ID = '00000000-0000-4000-8000-0000000000a9';
const POINT_ID = '00000000-0000-4000-8000-0000000000b1';
const USER_ID = '00000000-0000-4000-8000-0000000000c1';

const makeSut = () => {
  const events = new InMemoryAccessEventRepository();
  const clock = new FakeClock();
  const logger = new SpyLogger();
  const sut = new AccessEventRecorder(events, new SequentialIdGenerator(), clock, logger);
  return { sut, events, clock, logger };
};

describe('AccessEventRecorder.recordDenied', () => {
  it.each(DENIAL_REASONS)('deve gravar exatamente um evento NEGADO com o motivo %s', async (motivo) => {
    const { sut, events } = makeSut();

    await sut.recordDenied({
      metodo: 'QR',
      motivo,
      terminalId: TERMINAL_ID,
      accessPointId: POINT_ID,
      usuarioId: USER_ID,
    });

    const stored = events.all();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ resultado: 'NEGADO', motivo, metodo: 'QR', usuarioId: USER_ID });
  });

  it('deve usar o id do gerador e o instante do relógio, e gravar um evento por tentativa', async () => {
    const { sut, events, clock } = makeSut();
    const attempt = { metodo: 'QR' as const, motivo: 'USOS_ESGOTADOS' as const, usuarioId: USER_ID };

    await sut.recordDenied(attempt);
    clock.advance(1000);
    await sut.recordDenied(attempt);

    const [first, second] = events.all();
    expect(events.all()).toHaveLength(2);
    expect(first).toMatchObject({
      id: '00000000-0000-4000-8000-000000000001',
      ocorridoEm: new Date('2026-10-20T14:00:00Z'),
    });
    expect(second).toMatchObject({
      id: '00000000-0000-4000-8000-000000000002',
      ocorridoEm: new Date('2026-10-20T14:00:01Z'),
    });
  });

  it('deve gravar a tentativa por NFC com o terminal e sem usuário quando a tag é desconhecida', async () => {
    const { sut, events } = makeSut();

    await sut.recordDenied({
      metodo: 'NFC',
      motivo: 'TAG_DESCONHECIDA',
      terminalId: TERMINAL_ID,
      accessPointId: POINT_ID,
    });

    expect(events.all()[0]).toMatchObject({
      metodo: 'NFC',
      terminalId: TERMINAL_ID,
      usuarioId: null,
      motivo: 'TAG_DESCONHECIDA',
    });
  });

  it('deve não propagar o erro do repositório e registrar no log com o contexto da tentativa', async () => {
    const { sut, events, logger } = makeSut();
    events.failWith(new Error('banco fora do ar'));

    await expect(
      sut.recordDenied({
        metodo: 'QR',
        motivo: 'DISTANTE_DO_TERMINAL',
        terminalId: TERMINAL_ID,
        accessPointId: POINT_ID,
        usuarioId: USER_ID,
      }),
    ).resolves.toBeUndefined();

    expect(events.all()).toHaveLength(0);
    expect(logger.of('error')).toHaveLength(1);
    expect(logger.of('error')[0]?.meta).toEqual({
      motivo: 'DISTANTE_DO_TERMINAL',
      metodo: 'QR',
      terminalId: TERMINAL_ID,
      accessPointId: POINT_ID,
      usuarioId: USER_ID,
      erro: 'banco fora do ar',
    });
  });

  it('deve manter o hash da credencial fora do log de erro', async () => {
    const { sut, events, logger } = makeSut();
    const hash = '0123456789abcdef'.repeat(4);
    events.failWith(new Error('banco fora do ar'));

    await sut.recordDenied({
      metodo: 'QR',
      motivo: 'CREDENCIAL_INVALIDA',
      usuarioId: USER_ID,
      credencialHash: hash,
    });

    expect(JSON.stringify(logger.entries)).not.toContain(hash);
    expect(JSON.stringify(logger.entries)).not.toContain(hash.slice(0, 8));
  });
});
