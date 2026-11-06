import { SchemaLoginUser } from './login.schema';

const fieldErrors = (input: unknown) => {
  const result = SchemaLoginUser.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
};

describe('SchemaLoginUser', () => {
  it('campos vazios dão "Informe seu e-mail." e "Informe sua senha."', () => {
    expect(fieldErrors({ email: '', senha: '' })).toEqual({
      email: 'Informe seu e-mail.',
      senha: 'Informe sua senha.',
    });
  });

  it('e-mail sem "@" dá a mensagem de formato', () => {
    expect(fieldErrors({ email: 'maria.souza', senha: 'segredo' })).toEqual({
      email: 'Digite um e-mail válido. Exemplo: nome@email.com',
    });
  });

  it('e-mail só com espaços conta como vazio', () => {
    expect(fieldErrors({ email: '   ', senha: 'segredo' })).toEqual({
      email: 'Informe seu e-mail.',
    });
  });

  it('aceita e-mail com espaços nas pontas e entrega sem eles', () => {
    const result = SchemaLoginUser.parse({ email: '  admin@dev.local ', senha: 'Admin-Dev-2026' });

    expect(result).toEqual({ email: 'admin@dev.local', senha: 'Admin-Dev-2026' });
  });

  it('recusa e-mail com mais de 254 e senha com mais de 72 caracteres', () => {
    const email = `${'a'.repeat(250)}@dev.local`;

    expect(fieldErrors({ email, senha: 'x'.repeat(73) })).toEqual({
      email: 'Digite um e-mail válido. Exemplo: nome@email.com',
      senha: 'A senha tem no máximo 72 caracteres.',
    });
  });
});
