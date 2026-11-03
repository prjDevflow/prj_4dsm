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

  it.todo('deve usar o id do gerador e o instante do relógio, e gravar um evento por tentativa');
  it.todo('deve gravar a tentativa por NFC com o terminal e sem usuário quando a tag é desconhecida');
  it.todo('deve não propagar o erro do repositório e registrar no log com o contexto da tentativa');
  it.todo('deve manter o hash da credencial e qualquer token fora do log de erro');
});
