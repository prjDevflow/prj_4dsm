import type { NewTerminalCommand } from '../../src/entities/TerminalCommand';

/** An `ABRIR` command created at 14:00:00Z that the terminal may receive for 10 s. */
export function makeNewTerminalCommand(
  overrides: Partial<NewTerminalCommand> = {},
): NewTerminalCommand {
  const criadoEm = overrides.criadoEm ?? new Date('2026-10-20T14:00:00Z');
  return {
    terminalId: '00000000-0000-4000-8000-0000000000a9',
    tipo: 'ABRIR',
    motivo: null,
    aberturaMs: 5000,
    criadoEm,
    expiraEm: new Date(criadoEm.getTime() + 10_000),
    ...overrides,
  };
}
