import { QueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { useSessionStore } from '@/context/SessionStore';
import { TOKEN_KEY } from '@/context/tokenStorage';
import { sampleAdmin } from '@/service/fakes/sampleData';
import { createWrapper } from '@test/renderWithProviders';
import { useLogoutModel } from './logout.model';

describe('useLogoutModel', () => {
  beforeEach(() => useSessionStore.getState().signIn('token-123', sampleAdmin));

  it('"Sair" só abre o diálogo; cancelar fecha e mantém a sessão', async () => {
    const { result } = await renderHook(() => useLogoutModel(), { wrapper: createWrapper() });

    await act(() => result.current.onRequestLogout());
    expect(result.current.logoutDialogVisible).toBe(true);

    await act(() => result.current.onCancelLogout());
    expect(result.current.logoutDialogVisible).toBe(false);
    expect(useSessionStore.getState().usuario).toEqual(sampleAdmin);
  });

  it('confirmar apaga o token, fecha a sessão e limpa o cache', async () => {
    const clear = jest.spyOn(QueryClient.prototype, 'clear');
    const { result } = await renderHook(() => useLogoutModel(), { wrapper: createWrapper() });

    await act(() => result.current.onRequestLogout());
    await act(() => result.current.onConfirmLogout());

    expect(useSessionStore.getState()).toMatchObject({ token: null, usuario: null });
    expect(await SecureStore.getItemAsync(TOKEN_KEY)).toBeNull();
    expect(clear).toHaveBeenCalled();
  });
});
