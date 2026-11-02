import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { useSessionStore } from '@/context/SessionStore';
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
import { UserFormView } from './userForm.view';

// The view with its real model and fake services: what the page renders, without the router.
const renderForm = (userId?: string) => {
  const directory = new FakeUserDirectory();
  const services = {
    getUserService: new FakeGetUserService(directory),
    createUserService: new FakeCreateUserService(directory),
    updateUserService: new FakeUpdateUserService(directory),
  };
  const onClose = jest.fn();
  const Screen = () => <UserFormView {...useUserFormModel({ userId, ...services, onClose })} />;
  return { ...services, onClose, rendered: render(<Screen />, { wrapper: createWrapper() }) };
};

describe('UserFormView (T16)', () => {
  beforeEach(() => useSessionStore.getState().signIn('fake-token-admin', sampleAdmin));

  it('cadastro: campos, perfis, ajuda da senha e "Cancelar"/"Salvar", sem "Usuário ativo"', async () => {
    const { rendered } = renderForm();
    await rendered;

    expect(screen.getByRole('header', { name: 'Novo usuário' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Nome completo')).toBeOnTheScreen();
    expect(screen.getByLabelText('E-mail')).toHaveProp('editable', true);
    const perfil = screen.getByLabelText('Perfil');
    for (const name of ['Administrador', 'Condômino', 'Visitante']) {
      expect(within(perfil).getByRole('radio', { name })).not.toBeChecked();
    }
    expect(screen.getByLabelText('Senha')).toBeOnTheScreen();
    expect(screen.getByText('De 8 a 72 caracteres.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Confirmar senha')).toBeOnTheScreen();
    expect(screen.queryByRole('switch', { name: 'Usuário ativo' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeOnTheScreen();
  });

  it('"Salvar" com tudo vazio mostra o erro de cada campo', async () => {
    const { createUserService, rendered } = renderForm();
    await rendered;

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o nome completo (mínimo 3 letras).')).toBeOnTheScreen();
    expect(screen.getByText('Digite um e-mail válido.')).toBeOnTheScreen();
    expect(screen.getByText('Escolha um perfil.')).toBeOnTheScreen();
    expect(screen.getByText('A senha precisa ter pelo menos 8 caracteres.')).toBeOnTheScreen();
    expect(createUserService.calls).toHaveLength(0);
  });

  it('preenche, escolhe o perfil e salva; o e-mail repetido aparece no campo', async () => {
    const { createUserService, onClose, rendered } = renderForm();
    await rendered;

    await fireEvent.changeText(screen.getByLabelText('Nome completo'), 'Bruna Lopes');
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'admin@dev.local');
    await fireEvent.press(screen.getByRole('radio', { name: 'Visitante' }));
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'Senha-Valida-123');
    await fireEvent.changeText(screen.getByLabelText('Confirmar senha'), 'Senha-Valida-123');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Este e-mail já está cadastrado.')).toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'bruna.lopes@email.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(createUserService.calls.at(-1)).toMatchObject({ perfil: 'VISITANTE' });
  });

  it('enquanto salva, o botão diz "Salvando…"', async () => {
    const { createUserService, rendered } = renderForm();
    createUserService.exec = () => new Promise(() => {});
    await rendered;

    await fireEvent.changeText(screen.getByLabelText('Nome completo'), 'Bruna Lopes');
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'bruna@email.com');
    await fireEvent.press(screen.getByRole('radio', { name: 'Visitante' }));
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'Senha-Valida-123');
    await fireEvent.changeText(screen.getByLabelText('Confirmar senha'), 'Senha-Valida-123');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('button', { name: 'Salvando…' })).toBeOnTheScreen();
  });

  it('edição: "Editar usuário", e-mail só leitura, "Nova senha (opcional)" e "Usuário ativo"', async () => {
    const { rendered } = renderForm(sampleCondomino.id);
    await rendered;

    expect(await screen.findByLabelText('Nome completo')).toHaveProp('value', sampleCondomino.nome);
    expect(screen.getByRole('header', { name: 'Editar usuário' })).toBeOnTheScreen();
    expect(screen.getByLabelText('E-mail')).toHaveProp('editable', false);
    expect(screen.getByRole('radio', { name: 'Condômino' })).toBeChecked();
    expect(screen.getByLabelText('Nova senha (opcional)')).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Usuário ativo' })).toBeChecked();
  });

  it('desativar a si mesmo mostra a faixa "Você não pode desativar a si mesmo."', async () => {
    const { rendered } = renderForm(sampleAdmin.id);
    await rendered;

    await fireEvent.press(await screen.findByRole('switch', { name: 'Usuário ativo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      within(await screen.findByRole('alert')).getByText('Você não pode desativar a si mesmo.'),
    ).toBeOnTheScreen();
  });

  it('"Cancelar" com alterações pergunta "Descartar alterações?"', async () => {
    const { onClose, rendered } = renderForm();
    await rendered;

    await fireEvent.changeText(screen.getByLabelText('Nome completo'), 'Alguém');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('header', { name: 'Descartar alterações?' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar editando' }));
    expect(screen.queryByRole('header', { name: 'Descartar alterações?' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Descartar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('usuário que não existe mostra "Usuário não encontrado." com "Voltar para a lista"', async () => {
    const { onClose, rendered } = renderForm('nao-existe');
    await rendered;

    expect(await screen.findByText('Usuário não encontrado.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar para a lista' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('falha ao carregar mostra o erro com "Tentar novamente"', async () => {
    const context = renderForm(sampleCondomino.id);
    context.getUserService.willFail(new ApiError(null, 'NETWORK', 'Sem conexão'));
    await context.rendered;

    expect(await screen.findByText('Não foi possível carregar o usuário.')).toBeOnTheScreen();
    context.getUserService.willFail(null);
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByLabelText('Nome completo')).toHaveProp('value', sampleCondomino.nome);
  });
});
