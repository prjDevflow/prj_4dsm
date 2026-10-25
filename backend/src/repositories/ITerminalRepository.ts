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
   * Inserts a new terminal or updates the one with the same id. A second terminal for the same access
   * point throws a 409 `CONFLICT`; the database decides, so two simultaneous requests cannot both win.
   */
  save(terminal: Terminal): Promise<void>;
  /** Ordered by name. */
  list(filter: TerminalListFilter): Promise<TerminalListResult>;
}
