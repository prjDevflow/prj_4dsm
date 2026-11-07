import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import type { UsuarioCompleto } from '@/lib/types/users';
import { UsersListView } from './usersList.view';

const user = (nome: string, perfil: UsuarioCompleto['perfil'], ativo = true): UsuarioCompleto => ({
  id: `id-${nome}`,
  nome,
  email: `${nome.toLowerCase().replace(' ', '.')}@email.com`,
  perfil,
  ativo,
  criadoEm: '2026-10-21T14:32:07.000Z',
});

type Props = ComponentProps<typeof UsersListView>;

const renderView = (props: Partial<Props> = {}) => {
  const handlers = {
    onBack: jest.fn(),
    onNew: jest.fn(),
    onOpenUser: jest.fn(),
    onChangeSearch: jest.fn(),
    onChangePerfil: jest.fn(),
    onToggleInactive: jest.fn(),
    onRetry: jest.fn(),
    onRefresh: jest.fn(),
    onEndReached: jest.fn(),
    onRetryLoadMore: jest.fn(),
  };
  const all: Props = {
    search: '',
    perfil: 'TODOS',
    showInactive: false,
    users: [
      user('Carla Mendes', 'ADMIN'),
      user('Maria Souza', 'CONDOMINO'),
      user('Ana Lima', 'CONDOMINO', false),
    ],
    status: 'ready',
    errorMessage: '',
    refreshing: false,
    loadingMore: false,
    loadMoreFailed: false,
    ...handlers,
    ...props,
  };
  return { handlers, rendered: render(<UsersListView {...all} />) };
};

describe('UsersListView (T15)', () => {
  it('título "Usuários" com "Voltar"', async () => {
    const { handlers, rendered } = renderView();
    await rendered;

    expect(screen.getByRole('header', { name: 'Usuários' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(handlers.onBack).toHaveBeenCalled();
  });

  it('a busca tem o rótulo "Buscar por nome ou e-mail" e avisa o texto digitado', async () => {
    const { handlers, rendered } = renderView();
    await rendered;

    await fireEvent.changeText(screen.getByLabelText('Buscar por nome ou e-mail'), 'mar');

    expect(handlers.onChangeSearch).toHaveBeenCalledWith('mar');
  });

  it('filtros de perfil: "Todos" marcado, e os outros trocam o perfil', async () => {
    const { handlers, rendered } = renderView();
    await rendered;

    expect(screen.getByRole('button', { name: 'Todos' })).toBeSelected();
    for (const name of ['Administrador', 'Condômino', 'Visitante']) {
      expect(screen.getByRole('button', { name })).not.toBeSelected();
    }
    await fireEvent.press(screen.getByRole('button', { name: 'Condômino' }));

    expect(handlers.onChangePerfil).toHaveBeenCalledWith('CONDOMINO');
  });

  it('"Mostrar usuários inativos" começa desligado e liga', async () => {
    const { handlers, rendered } = renderView();
    await rendered;

    const toggle = screen.getByRole('switch', { name: 'Mostrar usuários inativos' });
    expect(toggle).not.toBeChecked();
    await fireEvent.press(toggle);

    expect(handlers.onToggleInactive).toHaveBeenCalledWith(true);
  });

  it('cada linha lê nome, e-mail, perfil e "Inativo", e abre o usuário', async () => {
    const { handlers, rendered } = renderView();
    await rendered;

    expect(
      screen.getByRole('button', {
        name: 'Carla Mendes, carla.mendes@email.com, Administrador',
      }),
    ).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Ana Lima, ana.lima@email.com, Condômino, Inativo' }),
    );

    expect(handlers.onOpenUser).toHaveBeenCalledWith('id-Ana Lima');
  });

  it('"Novo usuário" fica sempre à mostra', async () => {
    const { handlers, rendered } = renderView({ status: 'empty', users: [] });
    await rendered;

    await fireEvent.press(screen.getByRole('button', { name: 'Novo usuário' }));

    expect(handlers.onNew).toHaveBeenCalled();
  });

  it('vazio: "Nenhum usuário encontrado."', async () => {
    const { rendered } = renderView({ status: 'empty', users: [] });
    await rendered;

    expect(screen.getByText('Nenhum usuário encontrado.')).toBeOnTheScreen();
  });

  it('carregando mostra o aviso de carregamento', async () => {
    const { rendered } = renderView({ status: 'loading', users: [] });
    await rendered;

    expect(screen.getByRole('progressbar', { name: 'Carregando usuários…' })).toBeOnTheScreen();
  });

  it('erro mostra a mensagem e "Tentar novamente"', async () => {
    const { handlers, rendered } = renderView({
      status: 'error',
      users: [],
      errorMessage: 'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
    });
    await rendered;

    expect(screen.getByText('Não foi possível carregar os usuários.')).toBeOnTheScreen();
    expect(
      screen.getByText('Sem conexão com o servidor. Verifique sua internet e tente de novo.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(handlers.onRetry).toHaveBeenCalled();
  });

  it('carregando mais e falha ao carregar mais aparecem no fim da lista', async () => {
    const { rendered } = renderView({ loadingMore: true });
    await rendered;
    expect(screen.getByRole('progressbar', { name: 'Carregando mais…' })).toBeOnTheScreen();

    const failed = renderView({ loadMoreFailed: true });
    await failed.rendered;
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar carregar mais' }));
    expect(failed.handlers.onRetryLoadMore).toHaveBeenCalled();
  });
});
