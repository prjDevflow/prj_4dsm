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
  /**
   * Sets `executadoEm` on the command of this terminal; the first time is never overwritten, so repeating
   * it is harmless. False when the terminal has no such command (another terminal's command counts as none).
   */
  markExecuted(terminalId: string, id: number, at: Date): Promise<boolean>;
  /**
   * Deletes the commands whose `expiraEm` is before `cutoff` (strictly), delivered or not, of every
   * terminal. Returns how many. Ids are never reused, so a terminal's `after` stays valid.
   */
  deleteExpiredBefore(cutoff: Date): Promise<number>;
}
