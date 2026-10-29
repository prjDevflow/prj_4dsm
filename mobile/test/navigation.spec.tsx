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

const login = async (email: string) => {
  await fireEvent.changeText(screen.getByLabelText('E-mail'), email);
  await fireEvent.changeText(screen.getByLabelText('Senha'), 'Senha-Dev-2026');
  await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
};

describe('navegação por sessão', () => {
  beforeEach(() => useSessionStore.setState({ token: null, usuario: null, expired: false }));

  it('sem sessão, o app abre no login', async () => {
    await renderRouter('src/app', { initialUrl: '/' });

    expect(await screen.findByRole('header', { name: 'Entre com sua conta' })).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
  });

  it('o administrador entra e cai no início do administrador, sem voltar ao login', async () => {
    answerLogin(sampleAdmin);
    await renderRouter('src/app', { initialUrl: '/' });

    await login('admin@dev.local');

    expect(await screen.findByRole('header', { name: 'Administração' })).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
    expect(router.canGoBack()).toBe(false);
  });

  it.each([sampleCondomino, sampleVisitante])(
    'condômino e visitante caem no início da pessoa ($perfil)',
    async (usuario) => {
      answerLogin(usuario);
      await renderRouter('src/app', { initialUrl: '/' });

      await login(usuario.email);

      expect(await screen.findByRole('header', { name: 'Início' })).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: 'Administração' })).toBeNull();
    },
  );

  it('"Sair" volta ao login', async () => {
    answerLogin(sampleVisitante);
    await renderRouter('src/app', { initialUrl: '/' });
    await login('visitante@dev.local');

    await fireEvent.press(await screen.findByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('header', { name: 'Entre com sua conta' })).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
  });

  it('com sessão aberta, o endereço do login leva ao início', async () => {
    useSessionStore.setState({ token: 't', usuario: sampleCondomino });
    await renderRouter('src/app', { initialUrl: '/login' });

    expect(await screen.findByRole('header', { name: 'Início' })).toBeOnTheScreen();
  });
});
