import { act, fireEvent, screen, within } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';
import { useSessionStore } from '@/context/SessionStore';
import { TOKEN_KEY } from '@/context/tokenStorage';
import type { Usuario } from '@/lib/types/auth';
import { sampleAdmin, sampleCondomino, sampleVisitante } from '@/service/fakes/sampleData';
import { API_URL } from '@test/msw/handlers';
import { server } from '@test/msw/server';

// Real routes of src/app, real services, API answered by MSW.
const answerLogin = (usuario: Usuario) =>
  server.use(
    http.post(`${API_URL}/auth/login`, () =>
      HttpResponse.json({
        accessToken: `token-${usuario.perfil}`,
        tokenType: 'Bearer',
        expiresIn: 43200,
        usuario,
      }),
    ),
  );

const answerMe = (usuario: Usuario | null) =>
  server.use(
    http.get(`${API_URL}/auth/me`, () =>
      usuario
        ? HttpResponse.json(usuario)
        : HttpResponse.json(
            { error: { code: 'UNAUTHORIZED', message: 'Token ausente, inválido ou expirado' } },
            { status: 401 },
          ),
    ),
  );

// renderRouter turns on Jest's fake timers, and a real request (MSW over Node's fetch) started
// under them never settles. The opening reads the saved token as soon as the app mounts, so that
// first read waits until the real timers are back.
const renderApp = async (initialUrl = '/') => {
  const getItem = SecureStore.getItemAsync as jest.Mock;
  const readToken = getItem.getMockImplementation()!;
  let release = () => {};
  const realTimersBack = new Promise<void>((resolve) => {
    release = resolve;
  });
  getItem.mockImplementationOnce(async (key: string) => {
    await realTimersBack;
    return readToken(key);
  });

  const result = await renderRouter('src/app', { initialUrl });
  jest.useRealTimers();
  release();
  return result;
};

const login = async (usuario: Usuario) => {
  answerLogin(usuario);
  await fireEvent.changeText(await screen.findByLabelText('E-mail'), usuario.email);
  await fireEvent.changeText(screen.getByLabelText('Senha'), 'Senha-Dev-2026');
  await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
};

const pressLast = async (name: string) => {
  const buttons = await screen.findAllByRole('button', { name });
  await fireEvent.press(buttons[buttons.length - 1]);
};

const loginScreen = () => screen.findByRole('header', { name: 'Entre com sua conta' });

describe('sessão e navegação por perfil', () => {
  beforeEach(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    useSessionStore.setState({ token: null, usuario: null, expired: false });
  });

  it('sem token salvo, a abertura leva ao login', async () => {
    await renderApp();

    expect(await loginScreen()).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
  });

  it('já logado, abre direto no início do perfil, sem pedir senha', async () => {
    await SecureStore.setItemAsync(TOKEN_KEY, 'token-salvo');
    answerMe(sampleAdmin);
    await renderApp();

    expect(await screen.findByRole('header', { name: 'Administração' })).toBeOnTheScreen();
    expect(screen.queryByLabelText('Senha')).toBeNull();
  });

  it('token vencido leva ao login com o aviso de sessão expirada', async () => {
    await SecureStore.setItemAsync(TOKEN_KEY, 'token-vencido');
    answerMe(null);
    await renderApp();

    expect(await loginScreen()).toBeOnTheScreen();
    expect(screen.getByText('Sua sessão expirou. Entre novamente.')).toBeOnTheScreen();
    expect(await SecureStore.getItemAsync(TOKEN_KEY)).toBeNull();
  });

  it('o administrador vê os blocos de administração e o "Abrir catraca"', async () => {
    await renderApp();
    await login(sampleAdmin);

    expect(await screen.findByRole('header', { name: 'Administração' })).toBeOnTheScreen();
    for (const area of [
      'Autorizações',
      'Usuários',
      'Locais e terminais',
      'Tags NFC',
      'Histórico',
    ]) {
      expect(screen.getByRole('button', { name: new RegExp(`^${area},`) })).toBeOnTheScreen();
    }
    expect(screen.getByRole('button', { name: 'Abrir catraca' })).toBeOnTheScreen();
    expect(router.canGoBack()).toBe(false);
  });

  it.each([sampleCondomino, sampleVisitante])(
    'condômino e visitante veem o início da pessoa, sem blocos de administração ($perfil)',
    async (usuario) => {
      await renderApp();
      await login(usuario);

      expect(
        await screen.findByRole('header', { name: `Olá, ${usuario.nome.split(' ')[0]}` }),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Abrir catraca' })).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: 'Administração' })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Usuários,/ })).toBeNull();
    },
  );

  it('condômino que abre um endereço do administrador volta ao início', async () => {
    await SecureStore.setItemAsync(TOKEN_KEY, 'token-salvo');
    answerMe(sampleCondomino);
    await renderApp('/admin/usuarios');

    expect(await screen.findByRole('header', { name: 'Olá, Condômino' })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Usuários' })).toBeNull();
  });

  it('"Sair" só desloga depois de confirmar, e o voltar não retorna ao início', async () => {
    await renderApp();
    await login(sampleVisitante);
    await screen.findByRole('header', { name: 'Olá, Visitante' });

    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));
    expect(screen.getByRole('header', { name: 'Deseja sair?' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('header', { name: 'Olá, Visitante' })).toBeOnTheScreen();
    expect(useSessionStore.getState().usuario).not.toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));
    await pressLast('Sair');

    expect(await loginScreen()).toBeOnTheScreen();
    expect(await SecureStore.getItemAsync(TOKEN_KEY)).toBeNull();
    expect(router.canGoBack()).toBe(false);
  });

  it('trocar de administrador para visitante não deixa nada do anterior', async () => {
    await renderApp();
    await login(sampleAdmin);
    await screen.findByRole('header', { name: 'Administração' });
    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));
    await pressLast('Sair');
    await loginScreen();

    await login(sampleVisitante);

    expect(await screen.findByRole('header', { name: 'Olá, Visitante' })).toBeOnTheScreen();
    expect(screen.queryByText('Administrador (dev)')).toBeNull();
    expect(screen.queryByRole('header', { name: 'Administração' })).toBeNull();
  });

  it('um 401 em tela protegida leva ao login com o aviso', async () => {
    await renderApp();
    await login(sampleCondomino);
    await screen.findByRole('header', { name: 'Olá, Condômino' });

    await act(() => useSessionStore.getState().expireSession());

    expect(await loginScreen()).toBeOnTheScreen();
    expect(
      within(screen.getByRole('alert')).getByText('Sua sessão expirou. Entre novamente.'),
    ).toBeOnTheScreen();
  });

  it('"Minha conta" mostra os dados de quem está logado', async () => {
    await renderApp();
    await login(sampleCondomino);
    await screen.findByRole('header', { name: 'Olá, Condômino' });

    await fireEvent.press(screen.getByRole('button', { name: 'Minha conta' }));

    expect(await screen.findByRole('header', { name: 'Minha conta' })).toBeOnTheScreen();
    expect(screen.getByText('condomino@dev.local')).toBeOnTheScreen();
  });
});
