import { NotFoundError } from '../../../shared/errors/AppError';

/** Largest value of the `id` column (`INTEGER`). */
const MAX_COMMAND_ID = 2_147_483_647;

/**
 * Reads the `:id` of the route. Anything that is not a whole number the column can hold cannot match a
 * command, so it is a 404 like an unknown command (and never reaches the database, which would fail).
 */
export function parseCommandIdParam(value: unknown): number {
  const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(id) || id > MAX_COMMAND_ID) {
    throw new NotFoundError('Comando não encontrado');
  }
  return id;
}
