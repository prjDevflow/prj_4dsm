import { z } from 'zod';
import type { Perfil } from '@/lib/types/auth';

export type UserFormMode = 'create' | 'edit';

const NOME = 'Informe o nome completo (mínimo 3 letras).';
const EMAIL = 'Digite um e-mail válido.';
const PERFIL = 'Escolha um perfil.';
const SENHA_CURTA = 'A senha precisa ter pelo menos 8 caracteres.';

// bcrypt reads only the first 72 bytes, so the API refuses longer passwords.
const MAX_PASSWORD_BYTES = 72;
const passwordBytes = (senha: string) => new TextEncoder().encode(senha).length;

const perfis = ['ADMIN', 'CONDOMINO', 'VISITANTE'] as const satisfies readonly Perfil[];

/** Limits of the contract (B06): name 3 to 120, e-mail up to 254, password 8 to 72 bytes. */
export const userFormSchema = (mode: UserFormMode) =>
  z
    .object({
      nome: z
        .string()
        .trim()
        .min(3, { error: NOME })
        .max(120, { error: 'O nome pode ter no máximo 120 caracteres.' }),
      email: z
        .string()
        .trim()
        .max(254, { error: EMAIL })
        .pipe(z.email({ error: EMAIL })),
      // Starts empty (null): nothing is chosen for the administrator by default.
      perfil: z
        .enum(perfis, { error: PERFIL })
        .nullable()
        .pipe(z.enum(perfis, { error: PERFIL })),
      // On edit an empty password means "keep the current one".
      senha: z
        .string()
        .refine((senha) => (mode === 'edit' && senha === '') || senha.length >= 8, {
          error: SENHA_CURTA,
        })
        .refine((senha) => passwordBytes(senha) <= MAX_PASSWORD_BYTES, {
          error: 'A senha pode ter no máximo 72 caracteres.',
        }),
      confirmarSenha: z.string(),
      ativo: z.boolean(),
    })
    // `when` runs the check even when other fields have errors, so all of them show at once.
    .refine((values) => values.senha === values.confirmarSenha, {
      error: 'As senhas não são iguais.',
      path: ['confirmarSenha'],
      when: () => true,
    });

export type UserFormValues = Omit<z.input<ReturnType<typeof userFormSchema>>, 'perfil'> & {
  perfil: Perfil | null;
};
export type UserFormOutput = z.output<ReturnType<typeof userFormSchema>>;

export const emptyUserForm: UserFormValues = {
  nome: '',
  email: '',
  perfil: null,
  senha: '',
  confirmarSenha: '',
  ativo: true,
};
