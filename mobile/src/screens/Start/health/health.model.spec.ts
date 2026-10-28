import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/service/ApiError';
import { FakeGetHealthService } from '@/service/fakes/FakeGetHealthService';
import { sampleHealth } from '@/service/fakes/sampleData';
import { createWrapper } from '@test/renderWithProviders';
import { useHealthModel } from './health.model';

const API_URL = 'http://192.168.0.15:3000/api/v1';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const renderModel = (service: FakeGetHealthService, showCatalog = false) =>
  renderHook(() => useHealthModel({ getHealthService: service, apiUrl: API_URL, showCatalog }), {
    wrapper: createWrapper(),
  });

describe('useHealthModel', () => {
  it('mostra que está verificando enquanto a API não responde', async () => {
    const { result } = await renderModel(new FakeGetHealthService());

    expect(result.current).toMatchObject({
      apiUrl: API_URL,
      status: 'checking',
      title: 'Verificando a API…',
    });
    await waitFor(() => expect(result.current.status).toBe('ok'));
  });

  it('mostra "API: ok" com a versão e o banco conectado', async () => {
    const { result } = await renderModel(new FakeGetHealthService());

    await waitFor(() => expect(result.current.title).toBe('API: ok'));
    expect(result.current.detail).toBe('Versão 0.1.0 · banco de dados conectado');
  });

  it('avisa quando a API responde mas o banco está fora do ar', async () => {
    const { result } = await renderModel(new FakeGetHealthService({ ...sampleHealth, db: 'down' }));

    await waitFor(() => expect(result.current.title).toBe('API: ok'));
    expect(result.current.detail).toBe('Versão 0.1.0 · banco de dados fora do ar');
  });

  it.each(['NETWORK', 'TIMEOUT'])(
    'mostra "API: fora do ar" com a mensagem de conexão quando o erro é %s',
    async (code) => {
      const service = new FakeGetHealthService();
      service.willFail(new ApiError(null, code, 'Sem conexão'));
      const { result } = await renderModel(service);

      await waitFor(() => expect(result.current.title).toBe('API: fora do ar'));
      expect(result.current.status).toBe('down');
      expect(result.current.detail).toBe(
        'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
      );
    },
  );

  it('erro da API mostra texto amigável, nunca o código', async () => {
    const service = new FakeGetHealthService();
    service.willFail(new ApiError(500, 'INTERNAL_ERROR', 'Erro interno'));
    const { result } = await renderModel(service);

    await waitFor(() => expect(result.current.title).toBe('API: fora do ar'));
    expect(result.current.detail).toBe(
      'Não foi possível falar com a API agora. Tente novamente em instantes.',
    );
  });

  it('"Tentar novamente" chama a API de novo e mostra o novo resultado', async () => {
    const service = new FakeGetHealthService();
    service.willFail(new ApiError(null, 'NETWORK', 'Sem conexão'));
    const { result } = await renderModel(service);
    await waitFor(() => expect(result.current.status).toBe('down'));

    service.willReturn(sampleHealth);
    await act(() => result.current.onRetry());

    await waitFor(() => expect(result.current.title).toBe('API: ok'));
    expect(service.calls).toBe(2);
  });

  it('em desenvolvimento, abre o catálogo de componentes', async () => {
    const { result } = await renderModel(new FakeGetHealthService(), true);

    expect(result.current.showCatalog).toBe(true);
    act(() => result.current.onOpenCatalog());

    expect(mockPush).toHaveBeenCalledWith('/catalog');
  });

  it('fora do desenvolvimento, não oferece o catálogo', async () => {
    const { result } = await renderModel(new FakeGetHealthService());

    expect(result.current.showCatalog).toBe(false);
    await waitFor(() => expect(result.current.status).toBe('ok'));
  });
});
