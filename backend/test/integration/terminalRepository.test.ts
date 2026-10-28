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
