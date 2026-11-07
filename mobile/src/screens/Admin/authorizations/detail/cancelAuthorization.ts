import { z } from 'zod';
import { connectionMessage, detailsToFields } from '@/lib/apiMessages';
import type { ApiError } from '@/service/ApiError';

// The dialog "Cancelar esta autorização?" of T25: the optional reason and its errors.

export const cancelFormSchema = z.object({
  motivo: z.string().trim().max(200, { error: 'O motivo pode ter no máximo 200 caracteres.' }),
});

export type CancelFormValues = z.input<typeof cancelFormSchema>;
export type CancelFormOutput = z.output<typeof cancelFormSchema>;

type CancelError = { motivo?: string; banner: string | null };

export const cancelSaveError = (error: ApiError): CancelError => {
  if (error.status === 422) {
    const { fields, allOnFields } = detailsToFields(error, ['motivo'] as const);
    return { ...fields, banner: allOnFields ? null : 'Confira o motivo e tente de novo.' };
  }
  if (error.status === 404) {
    return { banner: 'Esta autorização não existe mais. Volte para a lista.' };
  }
  return {
    banner:
      connectionMessage(error) ?? 'Não foi possível cancelar agora. Tente novamente em instantes.',
  };
};
