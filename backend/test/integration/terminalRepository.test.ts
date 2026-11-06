import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaTerminalRepository } from '../../src/infra/repositories/PrismaTerminalRepository';
import { insertTerminal, prisma, resetDatabase, sha256Hex } from './helpers';

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
