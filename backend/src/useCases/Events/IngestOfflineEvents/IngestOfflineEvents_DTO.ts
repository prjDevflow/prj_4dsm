import { z } from 'zod';
import { DENIAL_REASONS } from '../../../entities/DenialReason';

/** The most events one request carries (doc 07, B19). */
export const MAX_OFFLINE_EVENTS = 50;

/**
 * One attempt the terminal kept. Only the shape is checked here; what a terminal may send (a UID that
 * normalizes, denials only, NFC only, `TERMINAL_OFFLINE`, a believable time) is the use case's business,
 * which also holds for a caller that skips the edge. Fields this version does not know are ignored.
 */
const OfflineEventSchema = z.object(
  {
    clientEventId: z
      .guid({ error: 'deve ser um UUID' })
      // Stored in lowercase, so the same key written in capitals is the same key.
      .transform((id) => id.toLowerCase()),
    metodo: z.enum(['QR', 'NFC'], { error: 'deve ser QR ou NFC' }),
    // Only its type: the use case checks the format, so a bad UID is listed together with the other problems.
    uid: z.string({ error: 'obrigatório' }),
    ocorridoEm: z.iso
      .datetime({ offset: true, error: 'deve ser um instante ISO 8601' })
      .transform((instant) => new Date(instant)),
    resultado: z.enum(['AUTORIZADO', 'NEGADO'], { error: 'deve ser AUTORIZADO ou NEGADO' }),
    motivo: z.enum(DENIAL_REASONS, { error: 'deve ser um código de negação do contrato' }),
  },
  { error: 'deve ser um objeto' },
);

export const IngestOfflineEventsSchema = z.object({
  events: z
    .array(OfflineEventSchema, { error: 'obrigatório, uma lista de eventos' })
    .min(1, 'deve ter ao menos 1 evento')
    .max(MAX_OFFLINE_EVENTS, `deve ter no máximo ${MAX_OFFLINE_EVENTS} eventos`),
});

export type IIngestOfflineEventsDTO = z.infer<typeof IngestOfflineEventsSchema>;
