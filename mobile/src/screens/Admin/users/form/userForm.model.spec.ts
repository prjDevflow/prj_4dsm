import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSessionStore } from '@/context/SessionStore';
import type { UsuarioCompleto } from '@/lib/types/users';
import { ApiError } from '@/service/ApiError';
import { FakeUserDirectory } from '@/service/fakes/FakeUserDirectory';
import {
  FakeCreateUserService,
  FakeGetUserService,
  FakeUpdateUserService,
} from '@/service/fakes/FakeUserServices';
import { sampleAdmin, sampleCondomino } from '@/service/fakes/sampleData';
import { createWrapper } from '@test/renderWithProviders';
import { useUserFormModel } from './userForm.model';

const setup = (userId?: string) => {
  const directory = new FakeUserDirectory();
  const services = {
    getUserService: new FakeGetUserService(directory),
    createUserService: new FakeCreateUserService(directory),
    updateUserService: new FakeUpdateUserService(directory),
  };
  const onClose = jest.fn();
  const hook = renderHook(() => useUserFormModel({ userId, ...services, onClose }), {
    wrapper: createWrapper(),
  });
  return { ...services, directory, onClose, hook };
};

type Model = ReturnType<typeof useUserFormModel>;

const fill = async (model: Model, values: Partial<Record<string, unknown>>) => {
  await act(() => {
    for (const [name, value] of Object.entries(values)) {
      model.form.setValue(name as 'nome', value as string, { shouldDirty: true });
    }
  });
};

const validUser = {
  nome: 'Bruna Lopes',
  email: 'Bruna.Lopes@Email.com',
  perfil: 'VISITANTE',
  senha: 'Senha-Valida-123',
  confirmarSenha: 'Senha-Valida-123',
};

const fieldError = (model: Model, name: 'nome' | 'email' | 'perfil' | 'senha' | 'confirmarSenha') =>
  model.form.getFieldState(name).error?.message;

describe('useUserFormModel', () => {
  beforeEach(() => useSessionStore.getState().signIn('fake-token-admin', sampleAdmin));

  describe('cadastro', () => {
    it('começa vazio, sem perfil escolhido e com o título "Novo usuário"', async () => {
      const { result } = await setup().hook;

      expect(result.current).toMatchObject({
        mode: 'create',
        title: 'Novo usuário',
        status: 'ready',
      });
      expect(result.current.form.getValues()).toMatchObject({
        nome: '',
        perfil: null,
        ativo: true,
      });
    });

    it('com campos inválidos não chama a API e marca cada campo', async () => {
      const { createUserService, hook } = await setup();
      const { result } = await hook;

      await act(() => result.current.onSubmit());

      expect(createUserService.calls).toHaveLength(0);
      expect(fieldError(result.current, 'nome')).toBe('Informe o nome completo (mínimo 3 letras).');
      expect(fieldError(result.current, 'email')).toBe('Digite um e-mail válido.');
      expect(fieldError(result.current, 'perfil')).toBe('Escolha um perfil.');
      expect(fieldError(result.current, 'senha')).toBe(
        'A senha precisa ter pelo menos 8 caracteres.',
      );
    });

    it('senha e confirmação diferentes impedem o envio', async () => {
      const { createUserService, hook } = setup();
      const { result } = await hook;

      await fill(result.current, { ...validUser, confirmarSenha: 'Outra-Senha-123' });
      await act(() => result.current.onSubmit());

      expect(createUserService.calls).toHaveLength(0);
      expect(fieldError(result.current, 'confirmarSenha')).toBe('As senhas não são iguais.');
    });

    it('válido: envia o e-mail em minúsculas, atualiza a lista e fecha', async () => {
      const invalidate = jest.spyOn(QueryClient.prototype, 'invalidateQueries');
      const { createUserService, directory, onClose, hook } = setup();
      const { result } = await hook;

      await fill(result.current, validUser);
      await act(() => result.current.onSubmit());

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
      expect(createUserService.calls).toEqual([
        {
          nome: 'Bruna Lopes',
          email: 'bruna.lopes@email.com',
          perfil: 'VISITANTE',
          senha: 'Senha-Valida-123',
        },
      ]);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['users'] });
      expect(directory.list({ q: 'bruna', page: 1, pageSize: 20 }).total).toBe(1);
    });

    it('e-mail repetido mostra o erro no campo E-mail, sem faixa e sem fechar', async () => {
      const { onClose, hook } = setup();
      const { result } = await hook;

      await fill(result.current, { ...validUser, email: 'ADMIN@dev.local' });
      await act(() => result.current.onSubmit());

      await waitFor(() =>
        expect(fieldError(result.current, 'email')).toBe('Este e-mail já está cadastrado.'),
      );
      expect(result.current.apiError).toBeNull();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('422 com details leva cada mensagem para o seu campo', async () => {
      const { createUserService, hook } = setup();
      createUserService.willFail(
        new ApiError(422, 'VALIDATION_ERROR', 'Dados inválidos', [
          { field: 'nome', message: 'deve ter no máximo 120 caracteres' },
        ]),
      );
      const { result } = await hook;

      await fill(result.current, validUser);
      await act(() => result.current.onSubmit());

      await waitFor(() =>
        expect(fieldError(result.current, 'nome')).toBe('Deve ter no máximo 120 caracteres.'),
      );
    });

    it('toque duplo em "Salvar" envia uma vez só', async () => {
      const { createUserService, hook } = setup();
      const { result } = await hook;

      await fill(result.current, validUser);
      await act(async () => {
        void result.current.onSubmit();
        void result.current.onSubmit();
      });

      await waitFor(() => expect(result.current.isSaving).toBe(false));
      expect(createUserService.calls).toHaveLength(1);
    });

    it('sem rede mostra a faixa, e ela some ao mexer no formulário', async () => {
      const { createUserService, hook } = setup();
      createUserService.willFail(new ApiError(null, 'NETWORK', 'Sem conexão'));
      const { result } = await hook;

      await fill(result.current, validUser);
      await act(() => result.current.onSubmit());
      await waitFor(() =>
        expect(result.current.apiError).toBe(
          'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
        ),
      );

      await fill(result.current, { nome: 'Bruna Lopes Silva' });
      expect(result.current.apiError).toBeNull();
    });
  });

  describe('edição', () => {
    const load = async (
      user: UsuarioCompleto = { ...sampleCondomino, ativo: true, criadoEm: '' },
    ) => {
      const context = setup(user.id);
      const { result } = await context.hook;
      await waitFor(() => expect(result.current.status).toBe('ready'));
      return { ...context, result };
    };

    it('carrega o usuário no formulário, com o título "Editar usuário"', async () => {
      const { getUserService, result } = await load();

      expect(getUserService.calls).toEqual([sampleCondomino.id]);
      expect(result.current).toMatchObject({ mode: 'edit', title: 'Editar usuário' });
      expect(result.current.form.getValues()).toMatchObject({
        nome: sampleCondomino.nome,
        email: sampleCondomino.email,
        perfil: 'CONDOMINO',
        senha: '',
        ativo: true,
      });
      expect(result.current.form.formState.isDirty).toBe(false);
    });

    it('envia só o que mudou, sem o e-mail, e fecha', async () => {
      const { updateUserService, onClose, result } = await load();

      await fill(result.current, { ativo: false, nome: 'Condômino Renomeado' });
      await act(() => result.current.onSubmit());

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(updateUserService.calls).toEqual([
        { id: sampleCondomino.id, body: { nome: 'Condômino Renomeado', ativo: false } },
      ]);
    });

    it('a senha é opcional; preenchida, vai no PATCH', async () => {
      const { updateUserService, result } = await load();

      await fill(result.current, { senha: 'Nova-Senha-123', confirmarSenha: 'Nova-Senha-123' });
      await act(() => result.current.onSubmit());

      await waitFor(() => expect(updateUserService.calls).toHaveLength(1));
      expect(updateUserService.calls[0].body).toEqual({ senha: 'Nova-Senha-123' });
    });

    it('sem nenhuma mudança, "Salvar" só fecha', async () => {
      const { updateUserService, onClose, result } = await load();

      await act(() => result.current.onSubmit());

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(updateUserService.calls).toHaveLength(0);
    });

    it('desativar a si mesmo mostra a mensagem amigável', async () => {
      const { onClose, result } = await load({ ...sampleAdmin, ativo: true, criadoEm: '' });

      await fill(result.current, { ativo: false });
      await act(() => result.current.onSubmit());

      await waitFor(() =>
        expect(result.current.apiError).toBe('Você não pode desativar a si mesmo.'),
      );
      expect(onClose).not.toHaveBeenCalled();
    });

    it('usuário que não existe dá o estado "não encontrado"', async () => {
      const { hook } = setup('nao-existe');
      const { result } = await hook;

      await waitFor(() => expect(result.current.status).toBe('notFound'));
    });

    it('falha ao carregar dá o erro, e "Tentar novamente" carrega de novo', async () => {
      const context = setup(sampleCondomino.id);
      context.getUserService.willFail(new ApiError(null, 'TIMEOUT', 'Tempo esgotado'));
      const { result } = await context.hook;

      await waitFor(() => expect(result.current.status).toBe('error'));
      expect(result.current.loadErrorMessage).toBe(
        'O servidor demorou para responder. Tente de novo.',
      );

      context.getUserService.willFail(null);
      await act(() => result.current.onRetryLoad());

      await waitFor(() => expect(result.current.status).toBe('ready'));
    });
  });

  describe('"Cancelar"', () => {
    it('sem alterações fecha direto', async () => {
      const { onClose, hook } = setup();
      const { result } = await hook;

      await act(() => result.current.onCancel());

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(result.current.discardDialogVisible).toBe(false);
    });

    it('com alterações pergunta; "Continuar editando" mantém e "Descartar" fecha', async () => {
      const { onClose, hook } = setup();
      const { result } = await hook;
      await fill(result.current, { nome: 'Alguém' });

      await act(() => result.current.onCancel());
      expect(result.current.discardDialogVisible).toBe(true);
      expect(onClose).not.toHaveBeenCalled();

      await act(() => result.current.onKeepEditing());
      expect(result.current.discardDialogVisible).toBe(false);
      expect(result.current.form.getValues('nome')).toBe('Alguém');

      await act(() => result.current.onCancel());
      await act(() => result.current.onDiscard());
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
