import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { useSessionStore } from '@/context/SessionStore';
import { TOKEN_KEY } from '@/context/tokenStorage';
import { ApiError } from '@/service/ApiError';
import { FakeGetMeService } from '@/service/fakes/FakeGetMeService';
import { sampleAdmin } from '@/service/fakes/sampleData';
import { useSplashModel } from './splash.model';

const renderModel = (service: FakeGetMeService) =>
  renderHook(() => useSplashModel({ getMeService: service }));

describe('useSplashModel', () => {
  beforeEach(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    useSessionStore.setState({ token: null, usuario: null, expired: false });
  });

  it('começa carregando', async () => {
    const { result } = await renderModel(new FakeGetMeService());

    expect(result.current.status).toBe('checking');
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('sem token salvo, libera o app sem usuário e sem chamar /auth/me', async () => {
    const service = new FakeGetMeService();
    const { result } = await renderModel(service);

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(service.calls).toBe(0);
    expect(useSessionStore.getState().usuario).toBeNull();
  });

  it('com token válido, chama /auth/me com ele e guarda o usuário', async () => {
    await SecureStore.setItemAsync(TOKEN_KEY, 'token-salvo');
    const service = new FakeGetMeService(sampleAdmin);
    const { result } = await renderModel(service);

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(service.tokensSeen).toEqual(['token-salvo']);
    expect(useSessionStore.getState()).toMatchObject({
      token: 'token-salvo',
      usuario: sampleAdmin,
    });
  });

  it('token vencido ou conta desativada (401): apaga o token e marca a sessão como expirada', async () => {
    await SecureStore.setItemAsync(TOKEN_KEY, 'token-vencido');
    const service = new FakeGetMeService();
    service.willFail(new ApiError(401, 'UNAUTHORIZED', 'Token ausente, inválido ou expirado'));
    const { result } = await renderModel(service);

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(useSessionStore.getState()).toMatchObject({ token: null, usuario: null, expired: true });
    expect(await SecureStore.getItemAsync(TOKEN_KEY)).toBeNull();
  });

  it('sem rede, mostra o erro, mantém o token e "Tentar novamente" chama de novo', async () => {
    await SecureStore.setItemAsync(TOKEN_KEY, 'token-salvo');
    const service = new FakeGetMeService(sampleAdmin);
    service.willFail(new ApiError(null, 'NETWORK', 'Sem conexão'));
    const { result } = await renderModel(service);

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorMessage).toBe(
      'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
    );
    expect(await SecureStore.getItemAsync(TOKEN_KEY)).toBe('token-salvo');

    service.willReturn(sampleAdmin);
    await act(() => result.current.onRetry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(service.calls).toBe(2);
    expect(useSessionStore.getState().usuario).toEqual(sampleAdmin);
  });
});
