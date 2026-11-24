import type { UsuarioCompleto } from '@/lib/types/users';
import { changedFields, toCreateBody, toFormValues } from './userForm.mappers';

const maria: UsuarioCompleto = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  nome: 'Maria Souza',
  email: 'maria@exemplo.com',
  perfil: 'CONDOMINO',
  ativo: true,
  criadoEm: '2026-10-21T14:32:07.000Z',
};

describe('mapeamento do formulário de usuário', () => {
  it('o usuário vira os valores do formulário, com as senhas vazias', () => {
    expect(toFormValues(maria)).toEqual({
      nome: 'Maria Souza',
      email: 'maria@exemplo.com',
      perfil: 'CONDOMINO',
      senha: '',
      confirmarSenha: '',
      ativo: true,
    });
  });

  it('o cadastro envia nome, e-mail em minúsculas, perfil e senha (sem a confirmação)', () => {
    expect(
      toCreateBody({
        nome: 'Maria Souza',
        email: 'Maria@Exemplo.com',
        perfil: 'CONDOMINO',
        senha: 'Senha-Valida-123',
        confirmarSenha: 'Senha-Valida-123',
        ativo: true,
      }),
    ).toEqual({
      nome: 'Maria Souza',
      email: 'maria@exemplo.com',
      perfil: 'CONDOMINO',
      senha: 'Senha-Valida-123',
    });
  });

  it('a edição envia só o que mudou e nunca o e-mail', () => {
    const values = { ...toFormValues(maria), email: 'outro@email.com' };

    expect(changedFields(maria, values)).toEqual({});
    expect(changedFields(maria, { ...values, nome: 'Maria S. Souza' })).toEqual({
      nome: 'Maria S. Souza',
    });
    expect(changedFields(maria, { ...values, perfil: 'VISITANTE', ativo: false })).toEqual({
      perfil: 'VISITANTE',
      ativo: false,
    });
  });

  it('a senha só vai quando foi preenchida', () => {
    const values = toFormValues(maria);

    expect(
      changedFields(maria, {
        ...values,
        senha: 'Nova-Senha-123',
        confirmarSenha: 'Nova-Senha-123',
      }),
    ).toEqual({ senha: 'Nova-Senha-123' });
  });
});
