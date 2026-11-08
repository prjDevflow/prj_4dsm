import { z } from 'zod';
import { DENIAL_REASONS } from '../../entities/DenialReason';
import { paginationShape } from '../../shared/pagination';

export const idField = z.guid({ error: 'deve ser um id válido' });

// An instant with `Z` or an offset, kept as a Date for the repository.
const instantField = z.iso
  .datetime({ offset: true, error: 'deve ser um instante ISO 8601' })
  .transform((value) => new Date(value));

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
