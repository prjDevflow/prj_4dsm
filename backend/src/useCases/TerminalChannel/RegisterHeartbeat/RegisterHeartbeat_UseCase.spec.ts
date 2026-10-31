import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { InMemoryTerminalRepository } from '../../../../test/doubles/InMemoryTerminalRepository';
import { makeTerminal } from '../../../../test/factories/makeTerminal';
import type { IRegisterHeartbeatDTO } from './RegisterHeartbeat_DTO';
import { RegisterHeartbeatUseCase } from './RegisterHeartbeat_UseCase';

const config = { minIntervalSeconds: 2, qrRefreshMs: 10000, commandPollMs: 1000, aberturaMs: 5000 };

const heartbeat = (overrides: Partial<IRegisterHeartbeatDTO> = {}): IRegisterHeartbeatDTO => ({
  latitude: -23.30512,
  longitude: -45.96551,
  gpsFix: true,
  gpsSimulado: false,
  firmware: '0.3.0',
  wifiRssi: -61,
  ...overrides,
});

const makeSut = async (terminalOverrides = {}) => {
  const terminals = new InMemoryTerminalRepository();
  const clock = new FakeClock(new Date('2026-10-20T14:32:07.456Z'));
  const terminal = makeTerminal(terminalOverrides);
  await terminals.save(terminal);
  const sut = new RegisterHeartbeatUseCase(terminals, clock, config);
  return { sut, terminals, clock, terminal };
};

describe('RegisterHeartbeat', () => {
  it('deve gravar o contato, o firmware, o rssi, o GPS e a posição do terminal', async () => {
    const { sut, terminals, terminal } = await makeSut();

    await sut.execute(terminal.id, heartbeat({ gpsSimulado: true }));

    expect(await terminals.findById(terminal.id)).toMatchObject({
      ultimoContatoEm: new Date('2026-10-20T14:32:07.456Z'),
      firmware: '0.3.0',
      rssi: -61,
      gpsFix: true,
      gpsSimulado: true,
      ultimaLat: -23.30512,
      ultimaLon: -45.96551,
    });
  });

  it.todo('deve devolver serverTime em UTC, sem milissegundos, e o bloco config');
  it.todo('deve gravar rssi nulo quando o terminal não manda wifiRssi');
  it.todo(
    'deve gravar gpsFix falso e manter a posição anterior, sem gravar latitude nem longitude',
  );
  it.todo('deve aceitar o primeiro heartbeat de um terminal que nunca fez contato');
  it.todo('deve negar com 429 o segundo heartbeat em menos de 2 s');
  it.todo('deve aceitar o heartbeat com exatamente 2 s e negar com 1,999 s');
  it.todo('deve manter o contato anterior quando o heartbeat é negado com 429');
  it.todo('deve respeitar o intervalo mínimo configurado');
});
