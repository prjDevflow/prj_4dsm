import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { ApiError } from '@/service/ApiError';
import { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import {
  FakeListAccessPointsService,
  FakeListBuildingsService,
  FakeListTerminalsService,
} from '@/service/fakes/FakeLocationServices';
import { createWrapper } from '@test/renderWithProviders';
import { useLocationsListModel } from './locationsList.model';
import { LocationsListView } from './locationsList.view';

// The view with its real model and fake services: what the page renders, without the router.
const renderList = (directory = new FakeLocationDirectory()) => {
  const services = {
    listBuildingsService: new FakeListBuildingsService(directory),
    listAccessPointsService: new FakeListAccessPointsService(directory),
    listTerminalsService: new FakeListTerminalsService(directory),
  };
  const navigation = {
    onBack: jest.fn(),
    onOpenTerminals: jest.fn(),
    onNewBuilding: jest.fn(),
    onEditBuilding: jest.fn(),
    onNewAccessPoint: jest.fn(),
    onEditAccessPoint: jest.fn(),
  };
  const Screen = () => <LocationsListView {...useLocationsListModel(services)} {...navigation} />;
  return {
    services,
    navigation,
    directory,
    rendered: render(<Screen />, { wrapper: createWrapper() }),
  };
};

const all = { page: 1, pageSize: 100 };

describe('Locais e terminais (T17)', () => {
  it('busca todas as páginas de edifícios, pontos e terminais', async () => {
    const { services, rendered } = renderList();
    await rendered;

    await screen.findByText('Edifício Central');
    expect(services.listBuildingsService.calls).toEqual([all]);
    expect(services.listAccessPointsService.calls).toEqual([all]);
    expect(services.listTerminalsService.calls).toEqual([all]);
  });

  it('a linha "Terminais" resume quantos há e quantos estão offline, e abre a lista', async () => {
    const { navigation, rendered } = renderList();
    await rendered;

    // Inactive terminals are not counted as offline.
    const row = await screen.findByRole('button', {
      name: 'Terminais, 4 terminais, 1 offline, 1 offline',
    });
    await fireEvent.press(row);

    expect(navigation.onOpenTerminals).toHaveBeenCalled();
  });

  it('cada edifício é um cartão com endereço, "Editar" e os pontos de acesso embaixo', async () => {
    const { navigation, directory, rendered } = renderList();
    await rendered;
    const central = directory.listBuildings(all).data[1];

    const card = await screen.findByTestId(`building-${central.id}`);
    expect(within(card).getByText('Rua das Acácias, 120')).toBeOnTheScreen();
    for (const name of [
      'Catraca Social, Catraca, CAT-01, Ativo',
      'Porta da Garagem, Porta, POR-02, Ativo',
      'Portaria Principal, Portaria, POR-01, Ativo',
    ]) {
      expect(within(card).getByRole('button', { name })).toBeOnTheScreen();
    }
    expect(within(card).queryByRole('button', { name: /^Catraca do Anexo/ })).toBeNull();

    await fireEvent.press(within(card).getByRole('button', { name: 'Editar Edifício Central' }));
    expect(navigation.onEditBuilding).toHaveBeenCalledWith(central.id);
  });

  it('ponto inativo tem o selo "Inativo"; tocar no ponto abre a edição', async () => {
    const { navigation, rendered } = renderList();
    await rendered;

    const anexo = await screen.findByRole('button', {
      name: 'Catraca do Anexo, Catraca, CAT-02, Inativo',
    });
    await fireEvent.press(anexo);

    expect(navigation.onEditAccessPoint).toHaveBeenCalledWith(expect.any(String));
  });

  it('"Adicionar local" abre o cadastro de ponto já no edifício; "Novo edifício" fica à mostra', async () => {
    const { navigation, directory, rendered } = renderList();
    await rendered;
    const central = directory.listBuildings(all).data[1];

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Adicionar local ao Edifício Central' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Novo edifício' }));

    expect(navigation.onNewAccessPoint).toHaveBeenCalledWith(central.id);
    expect(navigation.onNewBuilding).toHaveBeenCalled();
  });

  it('erro ao carregar mostra a mensagem e "Tentar novamente"', async () => {
    const context = renderList();
    context.services.listBuildingsService.willFail(new ApiError(null, 'NETWORK', 'Sem conexão'));
    await context.rendered;

    expect(await screen.findByText('Não foi possível carregar os locais.')).toBeOnTheScreen();
    context.services.listBuildingsService.willFail(null);
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Edifício Central')).toBeOnTheScreen();
  });

  it('puxar para atualizar busca as três listas de novo', async () => {
    const directory = new FakeLocationDirectory();
    const services = {
      listBuildingsService: new FakeListBuildingsService(directory),
      listAccessPointsService: new FakeListAccessPointsService(directory),
      listTerminalsService: new FakeListTerminalsService(directory),
    };
    const { result } = await renderHook(() => useLocationsListModel(services), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() => result.current.onRefresh());

    expect(services.listBuildingsService.calls).toHaveLength(2);
    expect(services.listTerminalsService.calls).toHaveLength(2);
    expect(result.current.refreshing).toBe(false);
  });
});
