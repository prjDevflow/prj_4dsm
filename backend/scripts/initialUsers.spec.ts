import { describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../src/shared/errors/AppError';
import {
  INITIAL_USERS,
  createInitialUsers,
  formatReport,
  generatePassword,
  type InitialUserInput,
} from './initialUsers';

const makeSut = (existing: string[] = []) => {
  const created: InitialUserInput[] = [];
  const create = vi.fn(async (input: InitialUserInput) => {
    if (existing.includes(input.email)) {
      throw new ConflictError('EMAIL_JA_CADASTRADO', 'Já existe um usuário com este e-mail');
    }
    created.push(input);
  });
  let n = 0;
  const password = () => `senha-gerada-${++n}-abcdef`;
  const run = () =>
    createInitialUsers({ users: INITIAL_USERS, create, generatePassword: password });
  return { run, create, created };
};

describe('INITIAL_USERS', () => {
  it('deve ter dois usuários de cada perfil', () => {
    const count = (perfil: string) => INITIAL_USERS.filter((u) => u.perfil === perfil).length;

    expect(INITIAL_USERS).toHaveLength(6);
    expect(count('ADMIN')).toBe(2);
    expect(count('CONDOMINO')).toBe(2);
    expect(count('VISITANTE')).toBe(2);
  });

  it('deve ter e-mails únicos, em minúsculas', () => {
    const emails = INITIAL_USERS.map((u) => u.email);

    expect(new Set(emails).size).toBe(emails.length);
    emails.forEach((email) => expect(email).toBe(email.toLowerCase()));
  });
});

describe('createInitialUsers', () => {
  it('deve criar os seis usuários, cada um com uma senha gerada diferente', async () => {
    const { run, created } = makeSut();

    const results = await run();

    expect(created).toHaveLength(6);
    expect(new Set(created.map((u) => u.senha)).size).toBe(6);
    expect(results.every((r) => r.situacao === 'CRIADO')).toBe(true);
    expect(results.map((r) => (r.situacao === 'CRIADO' ? r.senha : null))).toEqual(
      created.map((u) => u.senha),
    );
  });

  it('deve pular, sem erro e sem senha, o usuário cujo e-mail já existe (rodar de novo é seguro)', async () => {
    const existing = INITIAL_USERS[0]!.email;
    const { run, created } = makeSut([existing]);

    const results = await run();

    expect(created).toHaveLength(5);
    expect(results[0]).toEqual({
      email: existing,
      perfil: 'ADMIN',
      situacao: 'JA_EXISTIA',
    });
    expect(results.slice(1).every((r) => r.situacao === 'CRIADO')).toBe(true);
  });

  it('deve parar no primeiro erro que não seja e-mail repetido', async () => {
    const create = vi.fn(async () => {
      throw new Error('conexão recusada');
    });

    await expect(
      createInitialUsers({ users: INITIAL_USERS, create, generatePassword: () => 'x'.repeat(16) }),
    ).rejects.toThrow('conexão recusada');
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe('generatePassword', () => {
  it('deve gerar senhas de 20 caracteres em base64url, diferentes a cada chamada', () => {
    const a = generatePassword();
    const b = generatePassword();

    expect(a).toMatch(/^[A-Za-z0-9_-]{20}$/);
    expect(a).not.toBe(b);
  });
});

describe('formatReport', () => {
  it('deve mostrar a senha só dos usuários criados agora', () => {
    const report = formatReport([
      { email: 'a@passe.test', perfil: 'ADMIN', situacao: 'CRIADO', senha: 'senha-nova-123456789' },
      { email: 'b@passe.test', perfil: 'VISITANTE', situacao: 'JA_EXISTIA' },
    ]);

    expect(report).toContain('a@passe.test');
    expect(report).toContain('senha-nova-123456789');
    expect(report).toMatch(/b@passe\.test.*já existia/);
  });
});
