import { userFormSchema, type UserFormValues } from './userForm.schema';

const valid: UserFormValues = {
  nome: 'Maria Souza',
  email: 'maria.souza@email.com',
  perfil: 'CONDOMINO',
  senha: 'Senha-Valida-123',
  confirmarSenha: 'Senha-Valida-123',
  ativo: true,
};

const fieldErrors = (mode: 'create' | 'edit', input: Partial<UserFormValues>) => {
  const result = userFormSchema(mode).safeParse({ ...valid, ...input });
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
};

describe('userFormSchema', () => {
  it('aceita um cadastro válido e entrega nome e e-mail sem espaços nas pontas', () => {
    const result = userFormSchema('create').parse({
      ...valid,
      nome: '  Maria Souza ',
      email: ' maria.souza@email.com ',
    });

    expect(result).toMatchObject({ nome: 'Maria Souza', email: 'maria.souza@email.com' });
  });

  it('nome com menos de 3 letras (sem contar os espaços) dá a mensagem do nome', () => {
    const message = 'Informe o nome completo (mínimo 3 letras).';
    expect(fieldErrors('create', { nome: '' })).toEqual({ nome: message });
    expect(fieldErrors('create', { nome: ' Jo ' })).toEqual({ nome: message });
    expect(fieldErrors('create', { nome: 'Ana' })).toEqual({});
  });

  it('nome com mais de 120 caracteres é recusado', () => {
    expect(fieldErrors('create', { nome: 'a'.repeat(120) })).toEqual({});
    expect(fieldErrors('create', { nome: 'a'.repeat(121) })).toEqual({
      nome: 'O nome pode ter no máximo 120 caracteres.',
    });
  });

  it('e-mail vazio ou sem formato dá "Digite um e-mail válido."', () => {
    expect(fieldErrors('create', { email: '' })).toEqual({ email: 'Digite um e-mail válido.' });
    expect(fieldErrors('create', { email: 'maria.souza' })).toEqual({
      email: 'Digite um e-mail válido.',
    });
  });

  it('sem perfil dá "Escolha um perfil."', () => {
    expect(fieldErrors('create', { perfil: null })).toEqual({ perfil: 'Escolha um perfil.' });
  });

  it('na criação a senha é obrigatória e tem pelo menos 8 caracteres', () => {
    const message = 'A senha precisa ter pelo menos 8 caracteres.';
    expect(fieldErrors('create', { senha: '', confirmarSenha: '' })).toEqual({ senha: message });
    expect(fieldErrors('create', { senha: 'curta12', confirmarSenha: 'curta12' })).toEqual({
      senha: message,
    });
    expect(fieldErrors('create', { senha: '12345678', confirmarSenha: '12345678' })).toEqual({});
  });

  it('senha com mais de 72 bytes é recusada (o bcrypt ignoraria o resto)', () => {
    const longa = 'á'.repeat(37); // 74 bytes
    expect(fieldErrors('create', { senha: longa, confirmarSenha: longa })).toEqual({
      senha: 'A senha pode ter no máximo 72 caracteres.',
    });
  });

  it('na edição a senha é opcional, mas, se vier, precisa de 8 caracteres', () => {
    expect(fieldErrors('edit', { senha: '', confirmarSenha: '' })).toEqual({});
    expect(fieldErrors('edit', { senha: 'curta', confirmarSenha: 'curta' })).toEqual({
      senha: 'A senha precisa ter pelo menos 8 caracteres.',
    });
  });

  it('confirmação diferente impede o envio, inclusive junto com outros erros', () => {
    expect(fieldErrors('create', { confirmarSenha: 'Outra-Senha-123' })).toEqual({
      confirmarSenha: 'As senhas não são iguais.',
    });
    expect(fieldErrors('create', { nome: '', confirmarSenha: 'Outra-Senha-123' })).toEqual({
      nome: 'Informe o nome completo (mínimo 3 letras).',
      confirmarSenha: 'As senhas não são iguais.',
    });
    expect(fieldErrors('edit', { senha: '', confirmarSenha: 'sobrou' })).toEqual({
      confirmarSenha: 'As senhas não são iguais.',
    });
  });
});
