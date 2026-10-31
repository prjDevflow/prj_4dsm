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

  it('deve devolver serverTime em UTC, sem milissegundos, e o bloco config', async () => {
    const { sut, terminal } = await makeSut();

    const result = await sut.execute(terminal.id, heartbeat());

    expect(result).toEqual({
      serverTime: '2026-10-20T14:32:07Z',
      config: { qrRefreshMs: 10000, commandPollMs: 1000, aberturaMs: 5000 },
    });
  });

  it('deve gravar rssi nulo quando o terminal não manda wifiRssi', async () => {
    const { sut, terminals, terminal } = await makeSut({ rssi: -40 });

    await sut.execute(terminal.id, heartbeat({ wifiRssi: undefined }));

    expect((await terminals.findById(terminal.id))?.rssi).toBeNull();
  });

  it('deve gravar gpsFix falso e manter a posição anterior, sem gravar latitude nem longitude', async () => {
    const { sut, terminals, terminal } = await makeSut({ ultimaLat: -23.1, ultimaLon: -45.1 });

    await sut.execute(terminal.id, heartbeat({ gpsFix: false, latitude: -10, longitude: -20 }));

    expect(await terminals.findById(terminal.id)).toMatchObject({
      gpsFix: false,
      ultimaLat: -23.1,
      ultimaLon: -45.1,
    });
  });

  it('deve manter a posição vazia quando o terminal nunca teve fix e manda gpsFix falso', async () => {
    const { sut, terminals, terminal } = await makeSut();

    await sut.execute(terminal.id, heartbeat({ gpsFix: false, latitude: null, longitude: null }));

    expect(await terminals.findById(terminal.id)).toMatchObject({
      gpsFix: false,
      ultimaLat: null,
      ultimaLon: null,
    });
  });

  it('deve aceitar o primeiro heartbeat de um terminal que nunca fez contato', async () => {
    const { sut, terminal } = await makeSut({ ultimoContatoEm: null });

    await expect(sut.execute(terminal.id, heartbeat())).resolves.toBeDefined();
  });

  it('deve negar com 429 o segundo heartbeat em menos de 2 s', async () => {
    const { sut, clock, terminal } = await makeSut();
    await sut.execute(terminal.id, heartbeat());
    clock.advance(1999);

    const second = await sut.execute(terminal.id, heartbeat()).catch((e) => e);

    expect(second).toMatchObject({ code: 'RATE_LIMITED', status: 429 });
  });

  it('deve aceitar o heartbeat com exatamente 2 s', async () => {
    const { sut, clock, terminal } = await makeSut();
    await sut.execute(terminal.id, heartbeat());
    clock.advance(2000);

    await expect(sut.execute(terminal.id, heartbeat())).resolves.toBeDefined();
  });

  it('deve manter o contato anterior quando o heartbeat é negado com 429', async () => {
    const { sut, terminals, clock, terminal } = await makeSut();
    await sut.execute(terminal.id, heartbeat());
    clock.advance(1000);

    await sut.execute(terminal.id, heartbeat({ firmware: '9.9.9' })).catch(() => undefined);

    expect(await terminals.findById(terminal.id)).toMatchObject({
      ultimoContatoEm: new Date('2026-10-20T14:32:07.456Z'),
      firmware: '0.3.0',
    });
  });

  it('deve respeitar o intervalo mínimo configurado', async () => {
    const terminals = new InMemoryTerminalRepository();
    const clock = new FakeClock(new Date('2026-10-20T14:32:07.456Z'));
    const terminal = makeTerminal();
    await terminals.save(terminal);
    const sut = new RegisterHeartbeatUseCase(terminals, clock, {
      ...config,
      minIntervalSeconds: 5,
    });
    await sut.execute(terminal.id, heartbeat());
    clock.advance(4999);

    const tooSoon = await sut.execute(terminal.id, heartbeat()).catch((e) => e);
    clock.advance(1);
    const onTime = await sut.execute(terminal.id, heartbeat()).catch((e) => e);

    expect(tooSoon).toMatchObject({ status: 429 });
    expect(onTime).not.toBeInstanceOf(Error);
  });
});
