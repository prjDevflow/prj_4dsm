import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/service/ApiError';
import { FakeNfcTagDirectory } from '@/service/fakes/FakeNfcTagDirectory';
import {
  FakeListNfcTagsService,
  FakeUpdateNfcTagService,
} from '@/service/fakes/FakeNfcTagServices';
import { FakeUserDirectory } from '@/service/fakes/FakeUserDirectory';
import { FakeListUsersService } from '@/service/fakes/FakeUserServices';
import { sampleUsers } from '@/service/fakes/sampleData';
import { createTestQueryClient, createWrapper } from '@test/renderWithProviders';
import { useTagDetailModel } from './detail/tagDetail.model';
import { useTagsListModel } from './list/tagsList.model';

const [, condomino, visitante] = sampleUsers;

const setup = (queryClient = createTestQueryClient()) => {
  const directory = new FakeNfcTagDirectory();
  const first = directory.create({
    usuarioId: condomino.id,
    uid: '04A1B2C3',
    descricao: 'Chaveiro azul',
  });
  directory.create({ usuarioId: visitante.id, uid: '04F7E21A9C' });
  const services = {
    listNfcTagsService: new FakeListNfcTagsService(directory),
    listUsersService: new FakeListUsersService(new FakeUserDirectory()),
  };
  const hook = renderHook(() => useTagsListModel(services), {
    wrapper: createWrapper(queryClient),
  });
  return { ...services, directory, first, hook, queryClient };
};

const ready = async (context: ReturnType<typeof setup>, status = 'ready') => {
  const { result } = await context.hook;
  await waitFor(() => expect(result.current.status).toBe(status));
  return result;
};

describe('useTagsListModel (T28)', () => {
  it('lista da mais nova para a mais antiga, com o nome da pessoa', async () => {
    const context = setup();
    const result = await ready(context);

    expect(context.listNfcTagsService.calls).toEqual([{ page: 1, pageSize: 20 }]);
    await waitFor(() => expect(result.current.items[0].pessoa).toBe(visitante.nome));
    expect(result.current.items.map((item) => item.tag.uid)).toEqual(['04F7E21A9C', '04A1B2C3']);
  });

  it('a busca por pessoa vira o filtro da consulta', async () => {
    const context = setup();
    const result = await ready(context);

    await act(() => result.current.onChangePessoa(condomino.id));

    await waitFor(() =>
      expect(context.listNfcTagsService.calls.at(-1)).toEqual({
        usuarioId: condomino.id,
        page: 1,
        pageSize: 20,
      }),
    );
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.hasFilters).toBe(true);

    await act(() => result.current.onClearFilters());
    await waitFor(() => expect(result.current.items).toHaveLength(2));
  });

  it('pagina no fim da lista e puxar atualiza', async () => {
    const context = setup();
    for (let index = 0; index < 25; index += 1) {
      context.directory.create({
        usuarioId: condomino.id,
        uid: `0A0B0C${String(index).padStart(2, '0')}`,
      });
    }
    const result = await ready(context);
    expect(result.current.items).toHaveLength(20);

    await act(async () => result.current.onEndReached());
    await waitFor(() => expect(result.current.items).toHaveLength(27));

    await act(() => result.current.onRefresh());
    expect(result.current.refreshing).toBe(false);
  });

  it('sem tags, fica vazio', async () => {
    const context = setup();
    context.listNfcTagsService.exec = async ({ page, pageSize }) => ({
      data: [],
      page,
      pageSize,
      total: 0,
    });

    await ready(context, 'empty');
  });

  it('um erro vira estado de erro com texto', async () => {
    const context = setup();
    context.listNfcTagsService.exec = jest
      .fn()
      .mockRejectedValue(new ApiError(null, 'NETWORK', ''));

    const result = await ready(context, 'error');
    expect(result.current.errorMessage).not.toBe('');
  });
});

describe('useTagDetailModel', () => {
  const detail = async () => {
    const queryClient = createTestQueryClient();
    const context = setup(queryClient);
    await ready(context);
    const updateNfcTagService = new FakeUpdateNfcTagService(context.directory);
    const hook = await renderHook(
      () =>
        useTagDetailModel({
          tagId: context.first.id,
          updateNfcTagService,
          listUsersService: context.listUsersService,
        }),
      { wrapper: createWrapper(queryClient) },
    );
    return { ...context, updateNfcTagService, result: hook.result };
  };

  it('acha a tag na lista carregada, com o código inteiro e a pessoa', async () => {
    const { result } = await detail();

    expect(result.current.tag).toMatchObject({ uid: '04A1B2C3', descricao: 'Chaveiro azul' });
    await waitFor(() => expect(result.current.pessoa).toBe(condomino.nome));
  });

  it('desativar pede confirmação antes de enviar', async () => {
    const { result, updateNfcTagService } = await detail();

    await act(async () => result.current.onToggleAtiva(false));

    expect(result.current.confirmVisible).toBe(true);
    expect(updateNfcTagService.calls).toEqual([]);
  });

  it('confirmar desativa na hora', async () => {
    const { result, updateNfcTagService, first } = await detail();
    await act(async () => result.current.onToggleAtiva(false));

    await act(() => result.current.onConfirmDeactivate());

    expect(updateNfcTagService.calls).toEqual([{ id: first.id, ativa: false }]);
    await waitFor(() => expect(result.current.tag?.ativa).toBe(false));
    expect(result.current.confirmVisible).toBe(false);
  });

  it('voltar na confirmação não muda nada', async () => {
    const { result, updateNfcTagService } = await detail();
    await act(async () => result.current.onToggleAtiva(false));

    await act(async () => result.current.onCancelDeactivate());

    expect(result.current.confirmVisible).toBe(false);
    expect(updateNfcTagService.calls).toEqual([]);
    expect(result.current.tag?.ativa).toBe(true);
  });

  it('se não der para mudar, avisa e mantém a tag como estava', async () => {
    const { result, updateNfcTagService } = await detail();
    updateNfcTagService.exec = jest.fn().mockRejectedValue(new ApiError(500, 'X', ''));
    await act(async () => result.current.onToggleAtiva(false));

    await act(() => result.current.onConfirmDeactivate());

    await waitFor(() =>
      expect(result.current.apiError).toBe('Não foi possível mudar a tag agora. Tente de novo.'),
    );
    expect(result.current.tag?.ativa).toBe(true);
    expect(result.current.confirmVisible).toBe(false);
  });

  it('ativar de novo não pede confirmação', async () => {
    const { result, updateNfcTagService, first } = await detail();
    await act(async () => result.current.onToggleAtiva(false));
    await act(() => result.current.onConfirmDeactivate());

    await act(async () => result.current.onToggleAtiva(true));

    await waitFor(() => expect(result.current.tag?.ativa).toBe(true));
    expect(updateNfcTagService.calls.at(-1)).toEqual({ id: first.id, ativa: true });
  });

  it('uma tag que não está carregada não quebra a tela', async () => {
    const { result } = await renderHook(
      () =>
        useTagDetailModel({
          tagId: 'nao-existe',
          updateNfcTagService: new FakeUpdateNfcTagService(new FakeNfcTagDirectory()),
          listUsersService: new FakeListUsersService(new FakeUserDirectory()),
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.tag).toBeNull();
  });
});
