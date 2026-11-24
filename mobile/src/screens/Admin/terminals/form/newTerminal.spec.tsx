import { fireEvent, render, screen } from '@testing-library/react-native';
import { FakeClipboardService } from '@/service/fakes/FakeDeviceServices';
import { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import {
  FakeCreateTerminalService,
  FakeListAccessPointsService,
  FakeListBuildingsService,
  FakeListTerminalsService,
} from '@/service/fakes/FakeLocationServices';
import { createTestQueryClient, createWrapper } from '@test/renderWithProviders';
import { useNewTerminalModel } from './newTerminal.model';
import { NewTerminalView } from './newTerminal.view';

const all = { page: 1, pageSize: 100 };

const renderForm = ({ withFreePoint = true } = {}) => {
  const directory = new FakeLocationDirectory();
  const central = directory.listBuildings(all).data[1];
  if (withFreePoint) {
    directory.createAccessPoint({
      buildingId: central.id,
      tipo: 'PORTA',
      nome: 'Porta dos Fundos',
      identificacao: 'POR-09',
      latitude: -23.3,
      longitude: -45.9,
      ativo: true,
    });
  }
  const services = {
    listAccessPointsService: new FakeListAccessPointsService(directory),
    listBuildingsService: new FakeListBuildingsService(directory),
    listTerminalsService: new FakeListTerminalsService(directory),
    createTerminalService: new FakeCreateTerminalService(directory),
    clipboardService: new FakeClipboardService(),
  };
  const created: string[] = [];
  const original = services.createTerminalService.exec.bind(services.createTerminalService);
  services.createTerminalService.exec = async (body) => {
    const answer = await original(body);
    created.push(answer.apiKey);
    return answer;
  };
  const onClose = jest.fn();
  const queryClient = createTestQueryClient();
  const Screen = () => <NewTerminalView {...useNewTerminalModel({ ...services, onClose })} />;
  return {
    ...services,
    created,
    onClose,
    queryClient,
    rendered: render(<Screen />, { wrapper: createWrapper(queryClient) }),
  };
};

const createTerminal = async () => {
  await fireEvent.changeText(await screen.findByLabelText('Nome'), 'Terminal dos Fundos');
  await fireEvent.press(screen.getByRole('button', { name: 'Ponto de acesso' }));
  await fireEvent.press(
    await screen.findByRole('radio', { name: 'Porta dos Fundos, Edifício Central' }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
};

describe('Novo terminal (T21 e T22)', () => {
  it('o ponto de acesso só oferece locais ativos que ainda não têm terminal', async () => {
    const { rendered } = renderForm();
    await rendered;

    expect(await screen.findByRole('header', { name: 'Novo terminal' })).toBeOnTheScreen();
    await fireEvent.press(await screen.findByRole('button', { name: 'Ponto de acesso' }));

    expect(
      await screen.findByRole('radio', { name: 'Porta dos Fundos, Edifício Central' }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: /^Catraca Social/ })).toBeNull();
    expect(screen.queryByRole('radio', { name: /^Catraca do Anexo/ })).toBeNull();
  });

  it('sem local livre, explica o que fazer', async () => {
    const { rendered } = renderForm({ withFreePoint: false });
    await rendered;

    expect(
      await screen.findByText(
        'Todos os locais ativos já têm terminal. Cadastre um local novo antes.',
      ),
    ).toBeOnTheScreen();
  });

  it('sem nome e sem ponto não envia', async () => {
    const { createTerminalService, rendered } = renderForm();
    await rendered;

    await fireEvent.press(await screen.findByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o nome.')).toBeOnTheScreen();
    expect(screen.getByText('Escolha o ponto de acesso.')).toBeOnTheScreen();
    expect(createTerminalService.calls).toHaveLength(0);
  });

  it('depois de salvar mostra a chave uma vez, com o aviso, "Copiar chave" e "Concluir"', async () => {
    const { created, clipboardService, onClose, rendered } = renderForm();
    await rendered;

    await createTerminal();

    expect(await screen.findByRole('header', { name: 'Chave do terminal' })).toBeOnTheScreen();
    expect(
      screen.getByText('Anote esta chave agora. Ela não será mostrada de novo.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Chave do Terminal dos Fundos')).toHaveProp('value', created[0]);
    expect(screen.queryByRole('button', { name: 'Voltar' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Copiar chave' }));
    expect(clipboardService.copied).toEqual([created[0]]);

    await fireEvent.press(screen.getByRole('button', { name: 'Concluir' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('a chave não fica no cache do TanStack Query (nem nas consultas, nem nas mutações)', async () => {
    const { created, queryClient, rendered } = renderForm();
    await rendered;

    await createTerminal();
    await screen.findByRole('header', { name: 'Chave do terminal' });

    const cached = JSON.stringify([
      queryClient
        .getQueryCache()
        .getAll()
        .map((query) => query.state.data),
      queryClient
        .getMutationCache()
        .getAll()
        .map((mutation) => mutation.state.data),
    ]);
    expect(created[0]).toHaveLength(43);
    expect(cached).not.toContain(created[0]);
  });
});
