import { z } from 'zod';
import { DENIAL_REASONS } from '../../entities/DenialReason';
import { paginationShape } from '../../shared/pagination';

export const idField = z.guid({ error: 'deve ser um id válido' });

// An instant with `Z` or an offset, kept as a Date for the repository.
// PostgreSQL has no year 0, so an instant that lands there (after the offset) is refused here
// instead of reaching the database and becoming a 500.
const instantField = z.iso
  .datetime({ offset: true, error: 'deve ser um instante ISO 8601' })
  .transform((value) => new Date(value))
  .refine((instant) => instant.getUTCFullYear() >= 1, 'deve ser a partir do ano 1');

/** The filters both history routes accept. Whose events they are is decided by each route. */
export const accessEventFilterShape = {
  accessPointId: idField.optional(),
  terminalId: idField.optional(),
  metodo: z.enum(['QR', 'NFC'], { error: 'deve ser QR ou NFC' }).optional(),
  resultado: z
    .enum(['AUTORIZADO', 'NEGADO'], { error: 'deve ser AUTORIZADO ou NEGADO' })
    .optional(),
  motivo: z.enum(DENIAL_REASONS, { error: 'deve ser um código de motivo conhecido' }).optional(),
  de: instantField.optional(),
  ate: instantField.optional(),
  ...paginationShape,
};

/** `de` and `ate` may be equal (one exact instant), but the period cannot run backwards. */
export const periodIsOrdered = (query: { de?: Date; ate?: Date }) =>
  !query.de || !query.ate || query.de.getTime() <= query.ate.getTime();

export const PERIOD_ORDER_ISSUE = { path: ['ate'], error: 'não pode ser anterior a de' };
