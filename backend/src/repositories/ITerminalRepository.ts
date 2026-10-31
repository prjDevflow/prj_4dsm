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
  /** Ordered by name. */
  list(filter: TerminalListFilter): Promise<TerminalListResult>;
}
