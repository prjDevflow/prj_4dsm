import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaTerminalRepository } from '../../src/infra/repositories/PrismaTerminalRepository';
import { insertTerminal, insertUser, prisma, resetDatabase, sha256Hex } from './helpers';

const terminals = new PrismaTerminalRepository(prisma);

describe('PrismaTerminalRepository: escritas direcionadas', () => {
  beforeEach(resetDatabase);

  it('updateDetails grava só nome e ativo: não desfaz a chave nem o contato gravados depois da leitura', async () => {
    const terminal = await insertTerminal({ apiKeyHash: sha256Hex('a') });
    const contact = new Date('2026-10-20T14:00:00Z');
    // Another request (a key rotation, the heartbeat of B11) writes after this one has read.
    await prisma.terminal.update({
      where: { id: terminal.id },
      data: { apiKeyHash: sha256Hex('b'), ultimoContatoEm: contact, ultimaLat: -23.1, rssi: -60 },
    });

    const updated = await terminals.updateDetails(terminal.id, { nome: 'Novo Nome', ativo: false });

    expect(updated).toMatchObject({ nome: 'Novo Nome', ativo: false, ultimoContatoEm: contact });
    const row = await prisma.terminal.findUniqueOrThrow({ where: { id: terminal.id } });
    expect(row).toMatchObject({
      apiKeyHash: sha256Hex('b'),
      ultimoContatoEm: contact,
      ultimaLat: -23.1,
      rssi: -60,
    });
  });

  it('updateDetails devolve null para terminal inexistente', async () => {
    expect(
      await terminals.updateDetails('5eed0000-0000-4000-8000-0000000000ff', { nome: 'X' }),
    ).toBeNull();
  });

  it('replaceKeyHash troca só o hash: não desfaz o nome nem o estado gravados depois da leitura', async () => {
    const terminal = await insertTerminal({ apiKeyHash: sha256Hex('a') });
    await prisma.terminal.update({
      where: { id: terminal.id },
      data: { nome: 'Renomeado', ativo: false },
    });

    expect(await terminals.replaceKeyHash(terminal.id, sha256Hex('c'))).toBe(true);

    const row = await prisma.terminal.findUniqueOrThrow({ where: { id: terminal.id } });
    expect(row).toMatchObject({ apiKeyHash: sha256Hex('c'), nome: 'Renomeado', ativo: false });
  });

  it('replaceKeyHash devolve false para terminal inexistente', async () => {
    expect(
      await terminals.replaceKeyHash('5eed0000-0000-4000-8000-0000000000ff', sha256Hex('c')),
    ).toBe(false);
  });
});

describe('PrismaTerminalRepository.updateHeartbeat', () => {
  beforeEach(resetDatabase);

  const contact = new Date('2026-10-20T14:00:00.000Z');
  const heartbeat = {
    contatoEm: new Date('2026-10-20T14:00:02.000Z'),
    gpsFix: true,
    gpsSimulado: true,
    firmware: '0.4.1',
    rssi: -70,
    posicao: { latitude: -23.2, longitude: -45.2 },
  };

  it('grava todos os campos do heartbeat quando o terminal nunca fez contato', async () => {
    const terminal = await insertTerminal();

    const stored = await terminals.updateHeartbeat(terminal.id, heartbeat, contact);

    expect(stored).toBe(true);
    expect(await prisma.terminal.findUniqueOrThrow({ where: { id: terminal.id } })).toMatchObject({
      ultimoContatoEm: heartbeat.contatoEm,
      gpsFix: true,
      gpsSimulado: true,
      firmware: '0.4.1',
      rssi: -70,
      ultimaLat: -23.2,
      ultimaLon: -45.2,
    });
  });

  it('grava quando o contato anterior é exatamente o limite e recusa 1 ms depois dele', async () => {
    const atLimit = await insertTerminal({ ultimoContatoEm: contact });
    const justAfter = await insertTerminal({ ultimoContatoEm: new Date(contact.getTime() + 1) });

    expect(await terminals.updateHeartbeat(atLimit.id, heartbeat, contact)).toBe(true);
    expect(await terminals.updateHeartbeat(justAfter.id, heartbeat, contact)).toBe(false);
    const untouched = await prisma.terminal.findUniqueOrThrow({ where: { id: justAfter.id } });
    expect(untouched).toMatchObject({ firmware: null, rssi: null, ultimaLat: null });
    expect(untouched.ultimoContatoEm).toEqual(new Date(contact.getTime() + 1));
  });

  it('sem posição mantém latitude e longitude gravadas e atualiza o resto', async () => {
    const terminal = await insertTerminal({ ultimaLat: -23.1, ultimaLon: -45.1, gpsFix: true });

    await terminals.updateHeartbeat(
      terminal.id,
      { ...heartbeat, gpsFix: false, posicao: null },
      contact,
    );

    expect(await prisma.terminal.findUniqueOrThrow({ where: { id: terminal.id } })).toMatchObject({
      gpsFix: false,
      firmware: '0.4.1',
      ultimaLat: -23.1,
      ultimaLon: -45.1,
    });
  });

  it('não desfaz a chave nem o nome do terminal', async () => {
    const terminal = await insertTerminal({ apiKeyHash: sha256Hex('a'), nome: 'Original' });

    await terminals.updateHeartbeat(terminal.id, heartbeat, contact);

    expect(await prisma.terminal.findUniqueOrThrow({ where: { id: terminal.id } })).toMatchObject({
      apiKeyHash: sha256Hex('a'),
      nome: 'Original',
      ativo: true,
    });
  });

  it('devolve false para terminal inexistente', async () => {
    expect(
      await terminals.updateHeartbeat('5eed0000-0000-4000-8000-0000000000ff', heartbeat, contact),
    ).toBe(false);
  });
});

describe('PrismaTerminalRepository.updateEnrollMode', () => {
  beforeEach(resetDatabase);

  const until = new Date('2026-10-20T14:01:00.000Z');

  it('grava só o usuário e o prazo: não desfaz o que outra requisição gravou depois da leitura', async () => {
    const user = await insertUser();
    const terminal = await insertTerminal({ apiKeyHash: sha256Hex('a') });
    // Another request (a key rotation, the heartbeat of B11) writes after this one has read.
    await prisma.terminal.update({
      where: { id: terminal.id },
      data: { apiKeyHash: sha256Hex('b'), nome: 'Renomeado', ativo: false, rssi: -61 },
    });

    expect(await terminals.updateEnrollMode(terminal.id, user.id, until)).toBe(true);

    const row = await prisma.terminal.findUniqueOrThrow({ where: { id: terminal.id } });
    expect(row).toMatchObject({
      modoCadastroUsuarioId: user.id,
      modoCadastroAte: until,
      apiKeyHash: sha256Hex('b'),
      nome: 'Renomeado',
      ativo: false,
      rssi: -61,
    });
  });

  it('substitui o modo anterior', async () => {
    const ana = await insertUser();
    const bruno = await insertUser();
    const terminal = await insertTerminal();
    await terminals.updateEnrollMode(terminal.id, ana.id, until);

    const later = new Date(until.getTime() + 30_000);
    expect(await terminals.updateEnrollMode(terminal.id, bruno.id, later)).toBe(true);

    const row = await prisma.terminal.findUniqueOrThrow({ where: { id: terminal.id } });
    expect(row).toMatchObject({ modoCadastroUsuarioId: bruno.id, modoCadastroAte: later });
  });

  it('devolve false para terminal inexistente', async () => {
    const user = await insertUser();

    expect(
      await terminals.updateEnrollMode('5eed0000-0000-4000-8000-0000000000ff', user.id, until),
    ).toBe(false);
  });
});

describe('PrismaTerminalRepository.consumeEnrollMode', () => {
  beforeEach(resetDatabase);

  const until = new Date('2026-10-20T14:01:00.000Z');
  const NOW = new Date('2026-10-20T14:00:00.000Z');

  async function enrolling() {
    const user = await insertUser();
    const terminal = await insertTerminal({
      apiKeyHash: sha256Hex('a'),
      modoCadastroUsuarioId: user.id,
      modoCadastroAte: until,
    });
    return { user, terminal };
  }

  const modeOf = async (id: string) => {
    const row = await prisma.terminal.findUniqueOrThrow({ where: { id } });
    return {
      modoCadastroUsuarioId: row.modoCadastroUsuarioId,
      modoCadastroAte: row.modoCadastroAte,
    };
  };

  it('deve limpar o modo e devolver true quando ele vale, sem tocar na chave nem no contato', async () => {
    const { user, terminal } = await enrolling();
    const contact = new Date('2026-10-20T13:59:00Z');
    await prisma.terminal.update({
      where: { id: terminal.id },
      data: { ultimoContatoEm: contact },
    });

    expect(await terminals.consumeEnrollMode(terminal.id, user.id, NOW)).toBe(true);

    expect(await modeOf(terminal.id)).toEqual({
      modoCadastroUsuarioId: null,
      modoCadastroAte: null,
    });
    const row = await prisma.terminal.findUniqueOrThrow({ where: { id: terminal.id } });
    expect(row).toMatchObject({ apiKeyHash: sha256Hex('a'), ultimoContatoEm: contact });
  });

  it('deve ainda valer no instante exato do prazo', async () => {
    const { user, terminal } = await enrolling();

    expect(await terminals.consumeEnrollMode(terminal.id, user.id, until)).toBe(true);
  });

  it('deve devolver false 1 ms depois do prazo e deixar o modo como estava', async () => {
    const { user, terminal } = await enrolling();

    const late = new Date(until.getTime() + 1);
    expect(await terminals.consumeEnrollMode(terminal.id, user.id, late)).toBe(false);

    expect(await modeOf(terminal.id)).toEqual({
      modoCadastroUsuarioId: user.id,
      modoCadastroAte: until,
    });
  });

  it('deve devolver false para o usuário de um modo que foi substituído, sem apagar o novo', async () => {
    const { user, terminal } = await enrolling();
    const other = await insertUser();
    await prisma.terminal.update({
      where: { id: terminal.id },
      data: { modoCadastroUsuarioId: other.id },
    });

    expect(await terminals.consumeEnrollMode(terminal.id, user.id, NOW)).toBe(false);

    expect((await modeOf(terminal.id)).modoCadastroUsuarioId).toBe(other.id);
  });

  it('deve devolver false sem modo ligado e para um terminal que não existe', async () => {
    const user = await insertUser();
    const terminal = await insertTerminal();

    expect(await terminals.consumeEnrollMode(terminal.id, user.id, NOW)).toBe(false);
    expect(
      await terminals.consumeEnrollMode('5eed0000-0000-4000-8000-0000000000ff', user.id, NOW),
    ).toBe(false);
  });

  it('deve deixar só uma de oito chamadas simultâneas gastar o modo', async () => {
    const { user, terminal } = await enrolling();

    const results = await Promise.all(
      Array.from({ length: 8 }, () => terminals.consumeEnrollMode(terminal.id, user.id, NOW)),
    );

    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
