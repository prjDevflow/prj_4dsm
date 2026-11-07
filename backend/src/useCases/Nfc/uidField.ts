import { z } from 'zod';
import { normalizeUid } from '../../entities/rules/normalizeUid';

export const UID_MESSAGE =
  'deve ser hexadecimal, com 8 a 20 caracteres (":", "-" e espaços são ignorados)';

/** A tag UID as the client writes it; the use case stores `normalizeUid` of it. */
export const uidField = z
  .string({ error: 'obrigatório' })
  .refine((value) => normalizeUid(value) !== null, UID_MESSAGE);
