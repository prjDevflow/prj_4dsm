import { terminalFormSchema } from './terminals.schema';

const fieldErrors = (input: Record<string, unknown>) => {
  const result = terminalFormSchema.safeParse({
    nome: 'Terminal Social',
    accessPointId: 'ap-1',
    ...input,
  });
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
};

describe('terminalFormSchema', () => {
  it('aceita nome e ponto de acesso e tira os espaços do nome', () => {
    expect(terminalFormSchema.parse({ nome: ' Terminal Social ', accessPointId: 'ap-1' })).toEqual({
      nome: 'Terminal Social',
      accessPointId: 'ap-1',
    });
  });

  it('nome obrigatório, até 120 caracteres', () => {
    expect(fieldErrors({ nome: ' ' })).toEqual({ nome: 'Informe o nome.' });
    expect(fieldErrors({ nome: 'a'.repeat(121) })).toEqual({
      nome: 'O nome pode ter no máximo 120 caracteres.',
    });
  });

  it('sem ponto de acesso dá "Escolha o ponto de acesso."', () => {
    expect(fieldErrors({ accessPointId: null })).toEqual({
      accessPointId: 'Escolha o ponto de acesso.',
    });
  });
});
