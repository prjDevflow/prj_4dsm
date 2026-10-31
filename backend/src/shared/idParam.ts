import { z } from 'zod';
import { NotFoundError } from './errors/AppError';

// Any 8-4-4-4-12 hex id: PostgreSQL accepts them all, and a stricter UUID check could hide seed ids.
const IdSchema = z.guid();

/** True when `value` has the id format, so it is safe to hand to the database. */
export const isValidId = (value: unknown): value is string => IdSchema.safeParse(value).success;

/**
 * Reads a `:id` route parameter. A malformed id cannot match any row, so it is a 404 and not a 422
 * (and never reaches the database, which would answer with a cast error).
 */
export function parseIdParam(value: unknown, message = 'Recurso não encontrado'): string {
  const parsed = IdSchema.safeParse(value);
  if (!parsed.success) throw new NotFoundError(message);
  return parsed.data;
}
