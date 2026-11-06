import * as SecureStore from 'expo-secure-store';
import type { Usuario } from '@/lib/types/auth';
import { useSessionStore } from './SessionStore';
import { TOKEN_KEY } from './tokenStorage';

const usuario: Usuario = {
  id: '7f8a1c2e-0000-4000-8000-000000000001',
  nome: 'Maria Souza',
  email: 'visitante@dev.local',
  perfil: 'VISITANTE',
};

describe('useSessionStore', () => {
  beforeEach(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    useSessionStore.setState({ token: null, usuario: null, expired: false });
  });

  it('signIn salva o token no armazenamento seguro e abre a sessão', async () => {
    await useSessionStore.getState().signIn('token-123', usuario);

    expect(await SecureStore.getItemAsync(TOKEN_KEY)).toBe('token-123');
    expect(useSessionStore.getState()).toMatchObject({
      token: 'token-123',
      usuario,
      expired: false,
    });
  });

  it('signOut apaga o token e fecha a sessão', async () => {
    await useSessionStore.getState().signIn('token-123', usuario);

    await useSessionStore.getState().signOut();

    expect(await SecureStore.getItemAsync(TOKEN_KEY)).toBeNull();
    expect(useSessionStore.getState()).toMatchObject({
      token: null,
      usuario: null,
      expired: false,
    });
  });

  it('expireSession apaga o token e marca a sessão como expirada', async () => {
    await useSessionStore.getState().signIn('token-123', usuario);

    useSessionStore.getState().expireSession();

    expect(useSessionStore.getState()).toMatchObject({ token: null, usuario: null, expired: true });
    expect(await SecureStore.getItemAsync(TOKEN_KEY)).toBeNull();
  });
});
