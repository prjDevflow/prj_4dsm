import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';
import { useSessionStore } from '@/context/SessionStore';
import { sampleAdmin, sampleCondomino, sampleVisitante } from '@/service/fakes/sampleData';
import type { Usuario } from '@/lib/types/auth';
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

// renderRouter turns on Jest's fake timers; with them the real request (MSW over Node's fetch)
// never settles before axios's 10 s timeout fires in fake time. Back to real timers after mounting.
const renderApp = async (initialUrl: string) => {
  const result = await renderRouter('src/app', { initialUrl });
  jest.useRealTimers();
  return result;
};

const login = async (email: string) => {
  await fireEvent.changeText(screen.getByLabelText('E-mail'), email);
  await fireEvent.changeText(screen.getByLabelText('Senha'), 'Senha-Dev-2026');
  await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
};

describe('navegação por sessão', () => {
  beforeEach(() => useSessionStore.setState({ token: null, usuario: null, expired: false }));

  it('sem sessão, o app abre no login', async () => {
    await renderApp('/');

    expect(await screen.findByRole('header', { name: 'Entre com sua conta' })).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
  });

  it('o administrador entra e cai no início do administrador, sem voltar ao login', async () => {
    answerLogin(sampleAdmin);
    await renderApp('/');

    await login('admin@dev.local');

    expect(await screen.findByRole('header', { name: 'Administração' })).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
    expect(router.canGoBack()).toBe(false);
  });

  it.each([sampleCondomino, sampleVisitante])(
    'condômino e visitante caem no início da pessoa ($perfil)',
    async (usuario) => {
      answerLogin(usuario);
      await renderApp('/');

      await login(usuario.email);

      expect(await screen.findByRole('header', { name: 'Início' })).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: 'Administração' })).toBeNull();
    },
  );

  it('"Sair" volta ao login', async () => {
    answerLogin(sampleVisitante);
    await renderApp('/');
    await login('visitante@dev.local');

    await fireEvent.press(await screen.findByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('header', { name: 'Entre com sua conta' })).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
  });

  it('com sessão aberta, o endereço do login leva ao início', async () => {
    useSessionStore.setState({ token: 't', usuario: sampleCondomino });
    await renderApp('/login');

    expect(await screen.findByRole('header', { name: 'Início' })).toBeOnTheScreen();
  });
});
