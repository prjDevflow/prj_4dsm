import { randomBytes } from 'node:crypto';
import { AppError } from '../src/shared/errors/AppError';

export type Perfil = 'ADMIN' | 'CONDOMINO' | 'VISITANTE';

export interface InitialUser {
  nome: string;
  email: string;
  perfil: Perfil;
}

export interface InitialUserInput extends InitialUser {
  senha: string;
}

export type InitialUserResult =
  | { email: string; perfil: Perfil; situacao: 'CRIADO'; senha: string }
  | { email: string; perfil: Perfil; situacao: 'JA_EXISTIA' };

/** The accounts of the homologation environment: two of each profile. Edit here to change them. */
export const INITIAL_USERS: readonly InitialUser[] = [
  { nome: 'Administrador 1', email: 'admin1@passe.test', perfil: 'ADMIN' },
  { nome: 'Administrador 2', email: 'admin2@passe.test', perfil: 'ADMIN' },
  { nome: 'Condômino 1', email: 'condomino1@passe.test', perfil: 'CONDOMINO' },
  { nome: 'Condômino 2', email: 'condomino2@passe.test', perfil: 'CONDOMINO' },
  { nome: 'Visitante 1', email: 'visitante1@passe.test', perfil: 'VISITANTE' },
  { nome: 'Visitante 2', email: 'visitante2@passe.test', perfil: 'VISITANTE' },
];

/** 15 random bytes in base64url: 20 characters, about 120 bits. */
export function generatePassword(): string {
  return randomBytes(15).toString('base64url');
}

export interface CreateInitialUsersDeps {
  users: readonly InitialUser[];
  /** The CreateUser use case: hashes the password and throws EMAIL_JA_CADASTRADO on a repeated e-mail. */
  create(input: InitialUserInput): Promise<unknown>;
  generatePassword(): string;
}

/** Creates the users one by one. An e-mail that already exists is skipped, so running it again is safe. */
export async function createInitialUsers(
  deps: CreateInitialUsersDeps,
): Promise<InitialUserResult[]> {
  const results: InitialUserResult[] = [];
  for (const user of deps.users) {
    const senha = deps.generatePassword();
    try {
      await deps.create({ ...user, senha });
      results.push({ email: user.email, perfil: user.perfil, situacao: 'CRIADO', senha });
    } catch (error) {
      if (error instanceof AppError && error.code === 'EMAIL_JA_CADASTRADO') {
        results.push({ email: user.email, perfil: user.perfil, situacao: 'JA_EXISTIA' });
        continue;
      }
      throw error;
    }
  }
  return results;
}

export function formatReport(results: readonly InitialUserResult[]): string {
  const lines = results.map((r) =>
    r.situacao === 'CRIADO'
      ? `${r.perfil.padEnd(10)} ${r.email.padEnd(24)} ${r.senha}`
      : `${r.perfil.padEnd(10)} ${r.email.padEnd(24)} já existia (senha não muda)`,
  );
  return `${['PERFIL     E-MAIL                   SENHA', ...lines].join('\n')}\n`;
}
