import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSessionStore } from '@/context/SessionStore';
import { ApiError } from '@/service/ApiError';
import { FakeAuthorizationDirectory } from '@/service/fakes/FakeAuthorizationDirectory';
import { FakeListAuthorizationsService } from '@/service/fakes/FakeAuthorizationServices';
import { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import {
  FakeListAccessPointsService,
  FakeListBuildingsService,
} from '@/service/fakes/FakeLocationServices';
import { FakeUserDirectory } from '@/service/fakes/FakeUserDirectory';
import { FakeListUsersService } from '@/service/fakes/FakeUserServices';
import { sampleAdmin, sampleUsers } from '@/service/fakes/sampleData';
import { createWrapper } from '@test/renderWithProviders';
import { useAuthorizationsListModel } from './authorizationsList.model';

const now = () => new Date(2026, 9, 20, 10, 0);
const firstPage = { page: 1, pageSize: 20 };

const setup = () => {
  const users = new FakeUserDirectory();
  const locations = new FakeLocationDirectory({ now });
  const authorizations = new FakeAuthorizationDirectory({ users, locations, now });
  const services = {
    listAuthorizationsService: new FakeListAuthorizationsService(authorizations),
    listUsersService: new FakeListUsersService(users),
    listBuildingsService: new FakeListBuildingsService(locations),
    listAccessPointsService: new FakeListAccessPointsService(locations),
  };
  const hook = renderHook(() => useAuthorizationsListModel(services), { wrapper: createWrapper() });
  return { ...services, authorizations, users, locations, hook };
};

const ready = async (context: ReturnType<typeof setup>) => {
  const { result } = await context.hook;
  await waitFor(() => expect(result.current.status).toBe('ready'));
  return result;
};

describe('useAuthorizationsListModel', () => {
  it('abre sem filtros, a primeira página de 20, com as mais recentes primeiro', async () => {
    const context = setup();
    const result = await ready(context);

    expect(context.listAuthorizationsService.calls).toEqual([firstPage]);
    expect(result.current.authorizations).toHaveLength(6);
    expect(result.current.situacao).toBe('TODAS');
    expect(result.current.hasFilters).toBe(false);
  });

  it.each([
    ['pessoa', 'onChangePessoa', 'u-1', { usuarioId: 'u-1' }],
    ['local', 'onChangeLocal', 'ap-1', { accessPointId: 'ap-1' }],
    ['situação', 'onChangeSituacao', 'CANCELADA', { situacao: 'CANCELADA' }],
    ['"De"', 'onChangeDataDe', '2026-10-01', { dataDe: '2026-10-01' }],
    ['"Até"', 'onChangeDataAte', '2026-10-31', { dataAte: '2026-10-31' }],
  ] as const)('o filtro de %s vira o parâmetro certo, sozinho', async (_, change, value, param) => {
    const context = setup();
    const result = await ready(context);

    await act(() => result.current[change](value as never));

    await waitFor(() =>
      expect(context.listAuthorizationsService.calls.at(-1)).toEqual({ ...param, ...firstPage }),
    );
    expect(result.current.hasFilters).toBe(true);
  });

  it('os filtros se combinam na mesma consulta', async () => {
    const context = setup();
    const result = await ready(context);

    await act(() => result.current.onChangePessoa('u-1'));
    await act(() => result.current.onChangeLocal('ap-1'));
    await act(() => result.current.onChangeSituacao('ATIVA'));
    await act(() => result.current.onChangeDataDe('2026-10-01'));
    await act(() => result.current.onChangeDataAte('2026-10-31'));

    await waitFor(() =>
      expect(context.listAuthorizationsService.calls.at(-1)).toEqual({
        usuarioId: 'u-1',
        accessPointId: 'ap-1',
        situacao: 'ATIVA',
        dataDe: '2026-10-01',
        dataAte: '2026-10-31',
        ...firstPage,
      }),
    );
  });

  it('"Todas" tira o filtro de situação', async () => {
    const context = setup();
    const result = await ready(context);

    await act(() => result.current.onChangeSituacao('EXPIRADA'));
    await act(() => result.current.onChangeSituacao('TODAS'));

    await waitFor(() => expect(context.listAuthorizationsService.calls.at(-1)).toEqual(firstPage));
    expect(result.current.hasFilters).toBe(false);
  });

  it('"Limpar filtros" zera tudo e fecha o período', async () => {
    const context = setup();
    const result = await ready(context);
    await act(() => result.current.onTogglePeriod());
    await act(() => result.current.onChangePessoa('u-1'));
    await act(() => result.current.onChangeSituacao('ATIVA'));
    await act(() => result.current.onChangeDataDe('2026-10-01'));

    await act(() => result.current.onClearFilters());

    await waitFor(() => expect(context.listAuthorizationsService.calls.at(-1)).toEqual(firstPage));
    expect(result.current).toMatchObject({
      usuarioId: null,
      accessPointId: null,
      situacao: 'TODAS',
      dataDe: null,
      dataAte: null,
      periodOpen: false,
      hasFilters: false,
    });
  });

  it('as pessoas do filtro incluem as inativas: elas também têm autorizações antigas', async () => {
    const context = setup();
    const result = await ready(context);

    await waitFor(() => expect(result.current.personOptions.length).toBe(sampleUsers.length));
    expect(result.current.personOptions.map(({ label }) => label)).toContain(
      'Eduarda Martins, Visitante',
    );
  });

  it('os locais do filtro incluem os inativos, agrupados por edifício', async () => {
    const context = setup();
    const result = await ready(context);

    await waitFor(() => expect(result.current.placeOptions).toHaveLength(4));
    expect(result.current.placeOptions[0]).toMatchObject({
      label: 'Catraca do Anexo, Edifício Anexo',
      group: 'Edifício Anexo',
    });
  });

  it('ao chegar no fim carrega a página seguinte, e para quando não há mais', async () => {
    const context = setup();
    useSessionStore.getState().signIn('fake-token-admin', sampleAdmin);
    const maria = sampleUsers.find((user) => user.nome === 'Maria Souza')!;
    const point = context.locations
      .listAccessPoints({ page: 1, pageSize: 100 })
      .data.find((ap) => ap.nome === 'Catraca Social')!;
    for (let index = 0; index < 20; index += 1) {
      context.authorizations.create(
        {
          usuarioId: maria.id,
          accessPointId: point.id,
          dataInicio: '2026-10-20',
          dataFim: '2026-10-25',
          horaInicio: '08:00',
          horaFim: '18:00',
          usosPermitidos: 1,
        },
        sampleAdmin,
      );
    }
    const result = await ready(context);
    expect(result.current.authorizations).toHaveLength(20);

    await act(() => result.current.onEndReached());

    await waitFor(() => expect(result.current.authorizations).toHaveLength(26));
    expect(context.listAuthorizationsService.calls[1]).toEqual({ page: 2, pageSize: 20 });

    await act(() => result.current.onEndReached());
    expect(context.listAuthorizationsService.calls).toHaveLength(2);
  });

  it('nenhum resultado dá o estado vazio', async () => {
    const context = setup();
    const result = await ready(context);

    await act(() => result.current.onChangePessoa('ninguem'));

    await waitFor(() => expect(result.current.status).toBe('empty'));
  });

  it('erro mostra a mensagem, e "Tentar novamente" busca de novo', async () => {
    const context = setup();
    context.listAuthorizationsService.willFail(new ApiError(null, 'NETWORK', 'Sem conexão'));
    const { result } = await context.hook;

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorMessage).toBe(
      'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
    );

    context.listAuthorizationsService.willFail(null);
    await act(() => result.current.onRetry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('puxar para atualizar busca a primeira página de novo', async () => {
    const context = setup();
    const result = await ready(context);

    await act(() => result.current.onRefresh());

    expect(context.listAuthorizationsService.calls).toEqual([firstPage, firstPage]);
    expect(result.current.refreshing).toBe(false);
  });
});
