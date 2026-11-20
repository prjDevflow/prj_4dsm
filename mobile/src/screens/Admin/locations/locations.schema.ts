import { z } from 'zod';
import { parseCoordinate } from '@/lib/coordinates';
import type { TipoPonto } from '@/lib/types/locations';

/** Required text up to the size of the column (B07). */
const requiredText = (max: number, missing: string, tooLong: string) =>
  z.string().trim().min(1, { error: missing }).max(max, { error: tooLong });

export const nomeField = requiredText(
  120,
  'Informe o nome.',
  'O nome pode ter no máximo 120 caracteres.',
);

/** Typed as text (comma or dot); delivered as a number inside the limits. */
const coordinateField = (missing: string, invalid: string, limit: number) =>
  z.string().transform((text, ctx) => {
    if (!text.trim()) {
      ctx.addIssue({ code: 'custom', message: missing });
      return z.NEVER;
    }
    const value = parseCoordinate(text);
    if (value === null || value < -limit || value > limit) {
      ctx.addIssue({ code: 'custom', message: invalid });
      return z.NEVER;
    }
    return value;
  });

const latitudeField = coordinateField('Informe a latitude.', 'Latitude inválida.', 90);
const longitudeField = coordinateField('Informe a longitude.', 'Longitude inválida.', 180);

/** T18 Edifício. */
export const buildingFormSchema = z.object({
  nome: nomeField,
  endereco: requiredText(
    255,
    'Informe o endereço.',
    'O endereço pode ter no máximo 255 caracteres.',
  ),
  latitude: latitudeField,
  longitude: longitudeField,
  ativo: z.boolean(),
});

export type BuildingFormValues = z.input<typeof buildingFormSchema>;
export type BuildingFormOutput = z.output<typeof buildingFormSchema>;

const tipos = ['PORTARIA', 'PORTA', 'CATRACA'] as const satisfies readonly TipoPonto[];

/** An id chosen in a list that starts empty (null); the output is never null. */
export const requiredId = (missing: string) =>
  z
    .string({ error: missing })
    .nullable()
    .pipe(z.string({ error: missing }));

const TIPO = 'Escolha o tipo.';

/** T19 Ponto de acesso. */
export const accessPointFormSchema = z.object({
  buildingId: requiredId('Escolha o edifício.'),
  tipo: z
    .enum(tipos, { error: TIPO })
    .nullable()
    .pipe(z.enum(tipos, { error: TIPO })),
  nome: nomeField,
  identificacao: requiredText(
    60,
    'Informe a identificação.',
    'A identificação pode ter no máximo 60 caracteres.',
  ),
  latitude: latitudeField,
  longitude: longitudeField,
  ativo: z.boolean(),
});

export type AccessPointFormValues = z.input<typeof accessPointFormSchema>;
export type AccessPointFormOutput = z.output<typeof accessPointFormSchema>;
