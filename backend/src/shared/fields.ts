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

const isRealDate = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  // `2099-02-30` passes the shape but rolls over to March, so the round trip tells it apart.
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

/** A calendar date as YYYY-MM-DD that exists (no 30 February). */
export const dateField = z
  .string({ error: 'obrigatório' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'deve estar no formato AAAA-MM-DD', abort: true })
  .refine(isRealDate, 'deve ser uma data que existe');

/** A time of day as HH:mm, 24 h. */
export const timeField = z
  .string({ error: 'obrigatório' })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'deve estar no formato HH:mm');
