import type { DenialReason } from './DenialReason';

export type CommandType = 'ABRIR' | 'NEGAR';

export interface TerminalCommand {
  /** Increasing integer, so the terminal can ask for commands "after" the last one it saw. */
  id: number;
  terminalId: string;
  tipo: CommandType;
  motivo: string | null;
  aberturaMs: number | null;
  criadoEm: Date;
  expiraEm: Date;
  entregueEm: Date | null;
  executadoEm: Date | null;
}

/** A command before it is stored: the database assigns the `id`, and it is neither delivered nor executed. */
export type NewTerminalCommand = Omit<TerminalCommand, 'id' | 'entregueEm' | 'executadoEm'>;

export interface NewOpenCommand {
  terminalId: string;
  now: Date;
  /** `COMMAND_TTL_SECONDS`: how long the terminal may still receive the command. */
  ttlSeconds: number;
  /** `OPEN_DURATION_MS`. */
  aberturaMs: number;
}

export interface NewDenyCommand {
  terminalId: string;
  motivo: DenialReason;
  now: Date;
  ttlSeconds: number;
}

/** A command can be delivered until `ttlSeconds` after it was created, and never after. */
const expiresAt = (now: Date, ttlSeconds: number) => new Date(now.getTime() + ttlSeconds * 1000);

export const TerminalCommand = {
  open(input: NewOpenCommand): NewTerminalCommand {
    return {
      terminalId: input.terminalId,
      tipo: 'ABRIR',
      motivo: null,
      aberturaMs: input.aberturaMs,
      criadoEm: input.now,
      expiraEm: expiresAt(input.now, input.ttlSeconds),
    };
  },

  deny(input: NewDenyCommand): NewTerminalCommand {
    return {
      terminalId: input.terminalId,
      tipo: 'NEGAR',
      motivo: input.motivo,
      aberturaMs: null,
      criadoEm: input.now,
      expiraEm: expiresAt(input.now, input.ttlSeconds),
    };
  },
};
