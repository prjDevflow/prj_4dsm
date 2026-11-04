import type { NewTerminalCommand, TerminalCommand } from '../entities/TerminalCommand';

export interface ITerminalCommandRepository {
  /** Stores the command; the database assigns the increasing `id`. */
  create(command: NewTerminalCommand): Promise<TerminalCommand>;
  /**
   * The terminal's commands with `id` greater than `after` that are still valid at `now` (a command whose
   * `expiraEm` is exactly `now` is still valid), in increasing `id` order, at most `limit`.
   */
  listPending(
    terminalId: string,
    after: number,
    limit: number,
    now: Date,
  ): Promise<TerminalCommand[]>;
  /** Sets `entregueEm` on the commands that have none yet; the first delivery time is never overwritten. */
  markDelivered(ids: number[], at: Date): Promise<void>;
}
