import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { EventoDeAcesso } from '@/lib/types/accessEvents';
import { ApiError } from '@/service/ApiError';
import {
  FakeAccessEventDirectory,
  sampleAccessEvents,
} from '@/service/fakes/FakeAccessEventDirectory';
import { FakeListAccessEventsService } from '@/service/fakes/FakeAccessEventServices';
import { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import {
  FakeListAccessPointsService,
  FakeListBuildingsService,
} from '@/service/fakes/FakeLocationServices';
import { FakeUserDirectory } from '@/service/fakes/FakeUserDirectory';
import { FakeListUsersService } from '@/service/fakes/FakeUserServices';
import { createTestQueryClient, createWrapper } from '@test/renderWithProviders';
import { useAccessEventDetail } from '../detail/accessEventDetail.model';
import { useAccessHistoryModel } from './accessHistory.model';

// 15:00 of 24/10 in São Paulo: the default period runs from 18/10 to the end of 24/10.
const NOW = new Date('2026-10-24T18:00:00Z');
const defaultPeriod = { de: '2026-10-18T00:00:00-03:00', ate: '2026-10-24T23:59:59.999-03:00' };
const firstPage = { page: 1, pageSize: 20 };

const setup = (
  events: EventoDeAcesso[] = sampleAccessEvents(NOW),
  queryClient = createTestQueryClient(),
) => {
  const users = new FakeUserDirectory();
  const locations = new FakeLocationDirectory();
  const services = {
    listAccessEventsService: new FakeListAccessEventsService(new FakeAccessEventDirectory(events)),
    listUsersService: new FakeListUsersService(users),
    listBuildingsService: new FakeListBuildingsService(locations),
    listAccessPointsService: new FakeListAccessPointsService(locations),
  };
  const hook = renderHook(() => useAccessHistoryModel({ ...services, now: () => NOW }), {
    wrapper: createWrapper(queryClient),
  });
  return { ...services, hook, queryClient };
};

const ready = async (context: ReturnType<typeof setup>, status = 'ready') => {
  const { result } = await context.hook;
  await waitFor(() => expect(result.current.status).toBe(status));
  return result;
};

describe('useAccessHistoryModel (T26)', () => {
  it('abre com os últimos 7 dias, do mais recente para o mais antigo', async () => {
    const context = setup();
    const result = await ready(context);

    expect(context.listAccessEventsService.calls).toEqual([{ ...defaultPeriod, ...firstPage }]);
    expect(result.current.periodLabel).toBe('Últimos 7 dias');
    expect(result.current.hasFilters).toBe(false);
    const instants = result.current.events.map((event) => event.ocorridoEm);
    expect(instants).toEqual([...instants].sort().reverse());
  });

  it.each([
    ['pessoa', 'onChangePessoa', 'u-1', { usuarioId: 'u-1' }],
    ['local', 'onChangeLocal', 'ap-1', { accessPointId: 'ap-1' }],
    ['método', 'onChangeMetodo', 'NFC', { metodo: 'NFC' }],
    ['resultado', 'onChangeResultado', 'NEGADO', { resultado: 'NEGADO' }],
    ['motivo', 'onChangeMotivo', 'TAG_DESCONHECIDA', { motivo: 'TAG_DESCONHECIDA' }],
  ] as const)('o filtro de %s vira o parâmetro certo, sozinho', async (_, change, value, param) => {
    const context = setup();
    const result = await ready(context);

    await act(() => result.current[change](value as never));

    await waitFor(() =>
      expect(context.listAccessEventsService.calls.at(-1)).toEqual({
        ...param,
        ...defaultPeriod,
        ...firstPage,
      }),
    );
    expect(result.current.hasFilters).toBe(true);
  });

  it('"Todos" no método e no resultado tira o parâmetro', async () => {
    const context = setup();
    const result = await ready(context);

    await act(() => result.current.onChangeMetodo('QR'));
    await act(() => result.current.onChangeMetodo('TODOS'));
    await act(() => result.current.onChangeResultado('AUTORIZADO'));
    await act(() => result.current.onChangeResultado('TODOS'));

    await waitFor(() =>
      expect(context.listAccessEventsService.calls.at(-1)).toEqual({
        ...defaultPeriod,
        ...firstPage,
      }),
    );
    expect(result.current.hasFilters).toBe(false);
  });

  it('o período escolhido vira o início e o fim dos dias em São Paulo', async () => {
    const context = setup();
    const result = await ready(context);

    await act(() => result.current.onChangeDataDe('2026-10-20'));
    await act(() => result.current.onChangeDataAte('2026-10-22'));

    await waitFor(() =>
      expect(context.listAccessEventsService.calls.at(-1)).toEqual({
        de: '2026-10-20T00:00:00-03:00',
        ate: '2026-10-22T23:59:59.999-03:00',
        ...firstPage,
      }),
    );
    expect(result.current.periodLabel).toBe('20/10 a 22/10');
    expect(result.current.hasFilters).toBe(true);
  });

  it('sem uma das datas, o período fica aberto daquele lado', async () => {
    const context = setup();
    const result = await ready(context);

    await act(() => result.current.onChangeDataAte(null));

    await waitFor(() =>
      expect(context.listAccessEventsService.calls.at(-1)).toEqual({
        de: defaultPeriod.de,
        ...firstPage,
      }),
    );
    expect(result.current.periodLabel).toBe('Desde 18/10');
  });

  it('os filtros se combinam na mesma consulta', async () => {
    const context = setup();
    const result = await ready(context);

    await act(() => result.current.onChangePessoa('u-1'));
    await act(() => result.current.onChangeMetodo('QR'));
    await act(() => result.current.onChangeResultado('NEGADO'));
    await act(() => result.current.onChangeMotivo('CREDENCIAL_EXPIRADA'));

    await waitFor(() =>
      expect(context.listAccessEventsService.calls.at(-1)).toEqual({
        usuarioId: 'u-1',
        metodo: 'QR',
        resultado: 'NEGADO',
        motivo: 'CREDENCIAL_EXPIRADA',
        ...defaultPeriod,
        ...firstPage,
      }),
    );
  });

  it('"Limpar filtros" volta aos últimos 7 dias, sem os outros filtros', async () => {
    const context = setup();
    const result = await ready(context);
    await act(() => result.current.onChangeResultado('NEGADO'));
    await act(() => result.current.onChangeDataDe('2026-10-01'));
    await act(() => result.current.onTogglePeriod());

    await act(() => result.current.onClearFilters());

    await waitFor(() =>
      expect(context.listAccessEventsService.calls.at(-1)).toEqual({
        ...defaultPeriod,
        ...firstPage,
      }),
    );
    expect(result.current.hasFilters).toBe(false);
    expect(result.current.periodOpen).toBe(false);
  });

  it('pagina: a próxima página vem no fim da lista', async () => {
    const many = Array.from({ length: 25 }, (_, index) => ({
      ...sampleAccessEvents(NOW)[0],
      id: `e-${String(index).padStart(2, '0')}`,
      ocorridoEm: new Date(NOW.getTime() - index * 60_000).toISOString(),
    }));
    const context = setup(many);
    const result = await ready(context);
    expect(result.current.events).toHaveLength(20);

    await act(async () => result.current.onEndReached());

    await waitFor(() => expect(result.current.events).toHaveLength(25));
    expect(context.listAccessEventsService.calls.at(-1)).toMatchObject({ page: 2 });
  });

  it('sem tentativas no período, fica vazio', async () => {
    const context = setup([]);

    await ready(context, 'empty');
  });

  it('um erro vira estado de erro com texto, e "Tentar novamente" busca de novo', async () => {
    const context = setup();
    context.listAccessEventsService.exec = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(null, 'NETWORK', 'Sem conexão'));
    const result = await ready(context, 'error');

    expect(result.current.errorMessage).not.toBe('');
  });
});

describe('useAccessEventDetail (T27)', () => {
  it('acha a tentativa na lista já carregada, sem nova chamada', async () => {
    const queryClient = createTestQueryClient();
    const context = setup(sampleAccessEvents(NOW), queryClient);
    const list = await ready(context);
    const target = list.current.events[2];

    const { result } = await renderHook(() => useAccessEventDetail(target.id), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.event).toEqual(target);
    expect(context.listAccessEventsService.calls).toHaveLength(1);
  });

  it('uma tentativa que não está carregada não quebra a tela', async () => {
    const { result } = await renderHook(() => useAccessEventDetail('nao-existe'), {
      wrapper: createWrapper(),
    });

    expect(result.current.event).toBeNull();
  });
});
