import { describe, expect, it } from 'vitest';
import { TerminalCommand } from './TerminalCommand';

const terminalId = '00000000-0000-4000-8000-0000000000a9';
const now = new Date('2026-10-20T14:32:07Z');

describe('TerminalCommand.open', () => {
  it('deve montar um comando ABRIR com aberturaMs, sem motivo, e validade de ttlSeconds', () => {
    const command = TerminalCommand.open({ terminalId, now, ttlSeconds: 10, aberturaMs: 5000 });

    expect(command).toEqual({
      terminalId,
      tipo: 'ABRIR',
      motivo: null,
      aberturaMs: 5000,
      criadoEm: now,
      expiraEm: new Date('2026-10-20T14:32:17Z'),
    });
  });

  it.todo('deve mudar expiraEm quando o ttl muda');
});

describe('TerminalCommand.deny', () => {
  it.todo('deve montar um comando NEGAR com o motivo, sem aberturaMs, e validade de ttlSeconds');
});
