import type { Terminal } from '../entities/Terminal';

export interface TerminalListFilter {
  /** 1-based. */
  page: number;
  pageSize: number;
}

export interface TerminalListResult {
  items: Terminal[];
  /** Matches before pagination. */
  total: number;
}

/** What one heartbeat tells the server about the terminal. */
export interface TerminalHeartbeat {
  /** When the server heard from the terminal (its own clock, never the terminal's). */
  contatoEm: Date;
  gpsFix: boolean;
  gpsSimulado: boolean;
  firmware: string;
  rssi: number | null;
  /** Null without a fix: the stored position stays as it was. */
  posicao: { latitude: number; longitude: number } | null;
}

export interface ITerminalRepository {
  findById(id: string): Promise<Terminal | null>;
  /**
   * Inserts a new terminal. A second terminal for the same access point throws a 409 `CONFLICT`; the
   * database decides, so two simultaneous requests cannot both win.
   */
  save(terminal: Terminal): Promise<void>;
  /**
   * Changes only the given columns, so a write based on an older read cannot undo what another request
   * stored meanwhile (a rotated key, the last contact of the heartbeat). Null when the terminal does not exist.
   */
  updateDetails(id: string, changes: { nome?: string; ativo?: boolean }): Promise<Terminal | null>;
  /** Replaces only the key hash. False when the terminal does not exist. */
  replaceKeyHash(id: string, apiKeyHash: string): Promise<boolean>;
  /**
   * Stores a heartbeat only if the terminal was last heard from at or before `previousContactUntil` (or never).
   * One conditional write, so two simultaneous heartbeats cannot both pass. False means nothing was written:
   * the previous contact was too recent (terminals are never deleted, so a missing id is not a case here).
   */
  updateHeartbeat(
    id: string,
    heartbeat: TerminalHeartbeat,
    previousContactUntil: Date,
  ): Promise<boolean>;
  /** Ordered by name. */
  list(filter: TerminalListFilter): Promise<TerminalListResult>;
}
