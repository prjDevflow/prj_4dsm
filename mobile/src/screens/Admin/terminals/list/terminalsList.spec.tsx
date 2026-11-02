import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import {
  FakeListAccessPointsService,
  FakeListBuildingsService,
  FakeListTerminalsService,
} from '@/service/fakes/FakeLocationServices';
import { createWrapper } from '@test/renderWithProviders';
import { useTerminalsListModel } from './terminalsList.model';
import { TerminalsListView } from './terminalsList.view';

// The fake directory and the screen share the same clock, so "Visto há" is predictable.
const now = new Date('2026-11-02T15:00:00.000Z');

const renderList = () => {
  const directory = new FakeLocationDirectory({ now: () => now });
  const services = {
    listTerminalsService: new FakeListTerminalsService(directory),
    listAccessPointsService: new FakeListAccessPointsService(directory),
    listBuildingsService: new FakeListBuildingsService(directory),
  };
  const navigation = { onBack: jest.fn(), onNew: jest.fn(), onOpen: jest.fn() };
  const Screen = () => (
    <TerminalsListView
      {...useTerminalsListModel({ ...services, now: () => now })}
      {...navigation}
    />
  );
  return { navigation, rendered: render(<Screen />, { wrapper: createWrapper() }) };
};

describe('Terminais (T20)', () => {
  it('cada terminal mostra local, "Visto há" e o selo Online, Offline ou Inativo', async () => {
    const { rendered } = renderList();
    await rendered;

    for (const name of [
      'Terminal da Garagem, Porta da Garagem, Edifício Central, Visto há 12 min · -23,30512, -45,96551, Offline',
      'Terminal Social, Catraca Social, Edifício Central, Visto agora · -23,30512, -45,96551, Online',
      'Terminal do Anexo, Catraca do Anexo, Edifício Anexo, Visto há 9 dias · -23,30561, -45,96502, Inativo',
    ]) {
      expect(await screen.findByRole('button', { name })).toBeOnTheScreen();
    }
  });

  it('tocar no terminal abre o detalhe; "Novo terminal" abre o cadastro', async () => {
    const { navigation, rendered } = renderList();
    await rendered;

    await fireEvent.press(await screen.findByRole('button', { name: /^Terminal Social,/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Novo terminal' }));

    expect(navigation.onOpen).toHaveBeenCalledWith(expect.any(String));
    expect(navigation.onNew).toHaveBeenCalled();
  });

  it('puxar para atualizar busca os terminais de novo; sem terminal, explica', async () => {
    const directory = new FakeLocationDirectory({ now: () => now });
    const services = {
      listTerminalsService: new FakeListTerminalsService(directory),
      listAccessPointsService: new FakeListAccessPointsService(directory),
      listBuildingsService: new FakeListBuildingsService(directory),
    };
    const { result } = await renderHook(
      () => useTerminalsListModel({ ...services, now: () => now }),
      {
        wrapper: createWrapper(),
      },
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() => result.current.onRefresh());

    expect(services.listTerminalsService.calls).toHaveLength(2);
    expect(result.current.refreshing).toBe(false);
  });
});
