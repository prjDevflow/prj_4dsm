import { z } from 'zod';
import { latitudeField, longitudeField } from '../../../shared/fields';

/** `ACS1:` and the 22 characters of a 16-byte token in base64url (doc 03, section 4.3). */
export const QR_PAYLOAD_PATTERN = /^ACS1:[A-Za-z0-9_-]{22}$/;

// Not strict: the app may send more fields in a newer version, and they are ignored.
export const ValidateQrAccessSchema = z.object({
  // Not a QR of this system: a 422, never an access attempt (no credential was read).
  payload: z
    .string({ error: 'deve ser o texto lido do QR Code' })
    .regex(
      QR_PAYLOAD_PATTERN,
      'deve ser o texto lido do QR Code do terminal (ACS1: e 22 caracteres)',
    ),
  // Missing or null is a decision (LOCALIZACAO_INVALIDA) inside a well-formed QR; out of range is a 422.
  latitude: latitudeField.nullish(),
  longitude: longitudeField.nullish(),
  precisaoMetros: z
    .number({ error: 'deve ser um número maior ou igual a zero' })
    .min(0, 'deve ser um número maior ou igual a zero')
    .nullish(),
});

export type IValidateQrAccessDTO = z.infer<typeof ValidateQrAccessSchema>;
