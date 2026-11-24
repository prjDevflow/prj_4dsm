import { z } from 'zod';
import { isValidUid, normalizeUid } from '@/lib/nfcUid';
import type { CreateNfcTagBody } from '@/lib/types/nfcTags';
import { CHOOSE_PERSON, INVALID_UID } from '../tags.messages';

// T29: the UID accepts what the person reads on the tag (04:a1:b2:c3) and is sent the way the
// server keeps it (04A1B2C3), with the same rule as the backend.
export const tagFormSchema = z.object({
  usuarioId: z.string().min(1, CHOOSE_PERSON),
  uid: z.string().transform(normalizeUid).refine(isValidUid, INVALID_UID),
  descricao: z
    .string()
    .transform((text) => text.trim())
    .refine((text) => text.length <= 120, 'Use até 120 caracteres.'),
});

export type TagFormValues = z.input<typeof tagFormSchema>;
export type TagFormOutput = z.output<typeof tagFormSchema>;

export const emptyTagForm: TagFormValues = { usuarioId: '', uid: '', descricao: '' };

/** A blank description is left out: the server would keep it as null anyway. */
export const toCreateBody = ({ usuarioId, uid, descricao }: TagFormOutput): CreateNfcTagBody =>
  descricao ? { usuarioId, uid, descricao } : { usuarioId, uid };
