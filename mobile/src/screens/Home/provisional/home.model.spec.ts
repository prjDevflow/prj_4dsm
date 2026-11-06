import { act, renderHook } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { useSessionStore } from '@/context/SessionStore';
import { TOKEN_KEY } from '@/context/tokenStorage';
import { sampleAdmin, sampleCondomino, sampleVisitante } from '@/service/fakes/sampleData';
import { createWrapper } from '@test/renderWithProviders';
import { useProvisionalHomeModel } from './home.model';

const renderModel = () => renderHook(() => useProvisionalHomeModel(), { wrapper: createWrapper() });

describe('useProvisionalHomeModel', () => {
  it('cumprimenta pelo primeiro nome e mostra o perfil do administrador', async () => {
    useSessionStore.setState({ token: 't', usuario: { ...sampleAdmin, nome: 'Carla Mendes' } });

    const { result } = await renderModel();

    expect(result.current).toMatchObject({
      isAdmin: true,
      title: 'Administração',
      greeting: 'Olá, Carla',
      perfil: 'Administrador',
      email: 'admin@dev.local',
    });
  });

  it.each([
    [sampleCondomino, 'Condômino'],
    [sampleVisitante, 'Visitante'],
  ])('condômino e visitante caem no início da pessoa (%s)', async (usuario, perfil) => {
    useSessionStore.setState({ token: 't', usuario });

    const { result } = await renderModel();

    expect(result.current).toMatchObject({ isAdmin: false, title: 'Início', perfil });
  });

  it('"Sair" apaga o token e fecha a sessão', async () => {
    await useSessionStore.getState().signIn('token-123', sampleCondomino);
    const { result } = await renderModel();

    await act(() => result.current.onSignOut());

    expect(useSessionStore.getState().usuario).toBeNull();
    expect(await SecureStore.getItemAsync(TOKEN_KEY)).toBeNull();
  });
});
