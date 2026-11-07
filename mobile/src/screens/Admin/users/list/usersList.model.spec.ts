import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/service/ApiError';
import { FakeUserDirectory } from '@/service/fakes/FakeUserDirectory';
import { FakeListUsersService } from '@/service/fakes/FakeUserServices';
import { sampleUsers } from '@/service/fakes/sampleData';
import { createWrapper } from '@test/renderWithProviders';
import { useUsersListModel } from './usersList.model';

const activeCount = sampleUsers.filter((user) => user.ativo).length;

const setup = (service = new FakeListUsersService(new FakeUserDirectory())) => {
  const hook = renderHook(() => useUsersListModel({ listUsersService: service }), {
    wrapper: createWrapper(),
  });
  return { service, hook };
};

describe('useUsersListModel', () => {
  afterEach(() => jest.useRealTimers());

  it('abre com os ativos de todos os perfis, a primeira página de 20', async () => {
    const { service, hook } = setup();
    const { result } = await hook;

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(service.calls).toEqual([{ ativo: true, page: 1, pageSize: 20 }]);
    expect(result.current.users).toHaveLength(20);
    expect(result.current.users.every((user) => user.ativo)).toBe(true);
  });

  it('a busca só vai 400 ms depois de parar de digitar, sem espaços nas pontas', async () => {
    jest.useFakeTimers();
    const { service, hook } = setup();
    const { result } = await hook;
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() => result.current.onChangeSearch('ma'));
    await act(() => jest.advanceTimersByTimeAsync(300));
    await act(() => result.current.onChangeSearch(' mar '));
    await act(() => jest.advanceTimersByTimeAsync(399));
    expect(service.calls).toHaveLength(1);
    expect(result.current.search).toBe(' mar ');

    await act(() => jest.advanceTimersByTimeAsync(1));

    await waitFor(() => expect(service.calls).toHaveLength(2));
    expect(service.calls[1]).toEqual({ q: 'mar', ativo: true, page: 1, pageSize: 20 });
  });

  it('busca, perfil e inativos se combinam na mesma consulta', async () => {
    jest.useFakeTimers();
    const { service, hook } = setup();
    const { result } = await hook;

    await act(() => result.current.onChangePerfil('CONDOMINO'));
    await act(() => result.current.onToggleInactive(true));
    await act(() => result.current.onChangeSearch('a'));
    await act(() => jest.advanceTimersByTimeAsync(400));

    await waitFor(() =>
      expect(service.calls.at(-1)).toEqual({ perfil: 'CONDOMINO', q: 'a', page: 1, pageSize: 20 }),
    );
    expect(result.current.perfil).toBe('CONDOMINO');
    expect(result.current.showInactive).toBe(true);
    await waitFor(() => expect(result.current.users.length).toBeGreaterThan(0));
    expect(result.current.users.every((user) => user.perfil === 'CONDOMINO')).toBe(true);
    expect(result.current.users.some((user) => !user.ativo)).toBe(true);
  });

  it('"Todos" tira o filtro de perfil', async () => {
    const { service, hook } = setup();
    const { result } = await hook;

    await act(() => result.current.onChangePerfil('ADMIN'));
    await act(() => result.current.onChangePerfil('TODOS'));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(service.calls.at(-1)).toEqual({ ativo: true, page: 1, pageSize: 20 });
  });

  it('ao chegar no fim carrega a página seguinte, e para quando não há mais', async () => {
    const { service, hook } = setup();
    const { result } = await hook;
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() => result.current.onEndReached());

    await waitFor(() => expect(result.current.users).toHaveLength(activeCount));
    expect(service.calls[1]).toEqual({ ativo: true, page: 2, pageSize: 20 });

    await act(() => result.current.onEndReached());
    expect(service.calls).toHaveLength(2);
  });

  it('nenhum resultado dá o estado vazio', async () => {
    jest.useFakeTimers();
    const { hook } = setup();
    const { result } = await hook;

    await act(() => result.current.onChangeSearch('ninguém com este nome'));
    await act(() => jest.advanceTimersByTimeAsync(400));

    await waitFor(() => expect(result.current.status).toBe('empty'));
    expect(result.current.users).toEqual([]);
  });

  it('erro mostra a mensagem e "Tentar novamente" busca de novo', async () => {
    const service = new FakeListUsersService(new FakeUserDirectory());
    service.willFail(new ApiError(null, 'NETWORK', 'Sem conexão'));
    const { result } = await setup(service).hook;

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorMessage).toBe(
      'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
    );

    service.willFail(null);
    await act(() => result.current.onRetry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('puxar para atualizar busca a primeira página de novo', async () => {
    const { service, hook } = setup();
    const { result } = await hook;
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() => result.current.onRefresh());

    expect(service.calls).toHaveLength(2);
    expect(service.calls[1]).toEqual({ ativo: true, page: 1, pageSize: 20 });
    expect(result.current.refreshing).toBe(false);
  });
});
