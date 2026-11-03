import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { FakeAuthorizationDirectory } from '@/service/fakes/FakeAuthorizationDirectory';
import { FakeListAuthorizationsService } from '@/service/fakes/FakeAuthorizationServices';
import { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import {
  FakeListAccessPointsService,
  FakeListBuildingsService,
} from '@/service/fakes/FakeLocationServices';
import { FakeUserDirectory } from '@/service/fakes/FakeUserDirectory';
import { FakeListUsersService } from '@/service/fakes/FakeUserServices';
import { createWrapper } from '@test/renderWithProviders';
import { useAuthorizationsListModel } from './authorizationsList.model';
import { AuthorizationsListView } from './authorizationsList.view';

const now = () => new Date(2026, 9, 20, 10, 0);

// The view with its real model and fake services: what the page renders, without the router.
const renderList = () => {
  const users = new FakeUserDirectory();
  const locations = new FakeLocationDirectory({ now });
  const authorizations = new FakeAuthorizationDirectory({ users, locations, now });
  const services = {
    listAuthorizationsService: new FakeListAuthorizationsService(authorizations),
    listUsersService: new FakeListUsersService(users),
    listBuildingsService: new FakeListBuildingsService(locations),
    listAccessPointsService: new FakeListAccessPointsService(locations),
  };
  const navigation = { onBack: jest.fn(), onNew: jest.fn(), onOpen: jest.fn() };
  const Screen = () => (
    <AuthorizationsListView {...useAuthorizationsListModel(services)} {...navigation} />
  );
  return { ...services, navigation, rendered: render(<Screen />, { wrapper: createWrapper() }) };
};

describe('Autorizações (T23)', () => {
  it('cada item lê pessoa, local, período, entradas e situação', async () => {
    const { rendered } = renderList();
    await rendered;

    expect(screen.getByRole('header', { name: 'Autorizações' })).toBeOnTheScreen();
    expect(
      await screen.findByRole('button', {
        name: 'Maria Souza, Catraca Social, Edifício Central, 19/10 a 25/10 · 08:00 às 18:00, Entradas: 1 de 3, Ativa',
      }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Bruno Alves,.*Cancelada$/ })).toBeOnTheScreen();
    expect(screen.getByText('19/10 a 25/10 · 08:00 às 18:00')).toBeOnTheScreen();
    expect(screen.getByText('Entradas: 1 de 3')).toBeOnTheScreen();
  });

  it('tocar num item abre o detalhe; "Nova autorização" abre o cadastro', async () => {
    const { navigation, rendered } = renderList();
    await rendered;

    await fireEvent.press(await screen.findByRole('button', { name: /^Ana Lima,/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Nova autorização' }));

    expect(navigation.onOpen).toHaveBeenCalledWith(expect.any(String));
    expect(navigation.onNew).toHaveBeenCalled();
  });

  it('"Buscar por pessoa" abre a lista de pessoas com busca e filtra pela escolhida', async () => {
    const { listAuthorizationsService, rendered } = renderList();
    await rendered;
    await screen.findByRole('button', { name: /^Ana Lima,/ });

    await fireEvent.press(screen.getByRole('button', { name: 'Pessoa' }));
    await fireEvent.changeText(await screen.findByLabelText('Buscar'), 'Ana Lima');
    await fireEvent.press(await screen.findByRole('radio', { name: 'Ana Lima, Condômino' }));

    expect(await screen.findByText('Ana Lima, Condômino')).toBeOnTheScreen();
    expect(listAuthorizationsService.calls.at(-1)).toEqual({
      usuarioId: expect.any(String),
      page: 1,
      pageSize: 20,
    });
    expect(screen.queryByRole('button', { name: /^Maria Souza,/ })).toBeNull();
  });

  it('o filtro de situação tem os cinco botões, com "Todas" marcado', async () => {
    const { listAuthorizationsService, rendered } = renderList();
    await rendered;
    await screen.findByRole('button', { name: /^Ana Lima,/ });

    expect(screen.getByRole('button', { name: 'Todas' })).toBeSelected();
    for (const name of ['Ativas', 'Canceladas', 'Expiradas', 'Esgotadas']) {
      expect(screen.getByRole('button', { name })).not.toBeSelected();
    }

    await fireEvent.press(screen.getByRole('button', { name: 'Canceladas' }));

    expect(await screen.findByRole('button', { name: /^Bruno Alves,/ })).toBeOnTheScreen();
    expect(listAuthorizationsService.calls.at(-1)).toMatchObject({ situacao: 'CANCELADA' });
    expect(screen.getByRole('button', { name: 'Canceladas' })).toBeSelected();
  });

  it('o chip "Local" abre os locais por edifício e passa a mostrar o escolhido', async () => {
    const { listAuthorizationsService, rendered } = renderList();
    await rendered;
    await screen.findByRole('button', { name: /^Ana Lima,/ });

    await fireEvent.press(screen.getByRole('button', { name: 'Local' }));
    expect(await screen.findByRole('header', { name: 'Edifício Central' })).toBeOnTheScreen();
    await fireEvent.press(
      await screen.findByRole('radio', { name: 'Porta da Garagem, Edifício Central' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Porta da Garagem, Edifício Central' }),
    ).toBeSelected();
    expect(listAuthorizationsService.calls.at(-1)).toMatchObject({
      accessPointId: expect.any(String),
    });
  });

  it('o chip "Período" mostra "De" e "Até"', async () => {
    const { rendered } = renderList();
    await rendered;
    await screen.findByRole('button', { name: /^Ana Lima,/ });
    expect(screen.queryByRole('button', { name: 'De' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Período' }));

    expect(screen.getByRole('button', { name: 'De' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Até' })).toBeOnTheScreen();
  });

  it('"Limpar filtros" só aparece com filtro ativo e volta a mostrar tudo', async () => {
    const { rendered } = renderList();
    await rendered;
    await screen.findByRole('button', { name: /^Ana Lima,/ });
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Expiradas' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Limpar filtros' }));

    expect(await screen.findByRole('button', { name: /^Ana Lima,/ })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Todas' })).toBeSelected();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
  });

  it('sem resultado mostra "Nenhuma autorização encontrada."', async () => {
    const { listAuthorizationsService, rendered } = renderList();
    listAuthorizationsService.exec = async ({ page, pageSize }) => ({
      data: [],
      page,
      pageSize,
      total: 0,
    });
    await rendered;

    expect(await screen.findByText('Nenhuma autorização encontrada.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Nova autorização' })).toBeOnTheScreen();
  });

  it('o selo de cada item vem da situação efetiva', async () => {
    const { rendered } = renderList();
    await rendered;

    const row = await screen.findByRole('button', { name: /^Bruno Alves,/ });

    expect(within(row).getByText('Cancelada')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Esgotada$/ })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Expirada$/ })).toBeOnTheScreen();
  });
});
