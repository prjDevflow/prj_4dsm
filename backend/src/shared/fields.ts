import { z } from 'zod';
import { NO_NUL_MESSAGE, hasNoNul } from './noNul';

/** A required text of up to `max` characters (the column size), trimmed and without NUL. */
export const requiredText = (max: number) =>
  z
    .string({ error: 'obrigatório' })
    .trim()
    .min(1, 'obrigatório')
    .max(max, `deve ter no máximo ${max} caracteres`)
    .refine(hasNoNul, NO_NUL_MESSAGE);

export const latitudeField = z
  .number({ error: 'deve ser um número entre -90 e 90' })
  .min(-90, 'deve estar entre -90 e 90')
  .max(90, 'deve estar entre -90 e 90');

export const longitudeField = z
  .number({ error: 'deve ser um número entre -180 e 180' })
  .min(-180, 'deve estar entre -180 e 180')
  .max(180, 'deve estar entre -180 e 180');
