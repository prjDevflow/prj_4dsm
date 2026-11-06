import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';
import { useSessionStore } from '@/context/SessionStore';
import { TOKEN_KEY } from '@/context/tokenStorage';
import type { Usuario } from '@/lib/types/auth';
import { FakeUserDirectory } from '@/service/fakes/FakeUserDirectory';
import { sampleAdmin, sampleCondomino, sampleVisitante } from '@/service/fakes/sampleData';
import { API_URL } from '@test/msw/handlers';
import { server } from '@test/msw/server';
import { usersHandlers } from '@test/msw/usersHandlers';

// Each test walks through several real screens; a slow machine passes Jest's default of 5 s.
jest.setTimeout(20_000);

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
    await renderApp('/admin/users');

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

  it('os atalhos da pessoa abrem as telas "Em breve", e o voltar retorna ao início', async () => {
    await renderApp();
    await login(sampleVisitante);
    await screen.findByRole('header', { name: 'Olá, Visitante' });

    for (const [button, title] of [
      ['Minhas autorizações', 'Minhas autorizações'],
      ['Meu histórico', 'Meu histórico'],
      ['Abrir catraca', 'Abrir catraca'],
    ]) {
      await fireEvent.press(screen.getByRole('button', { name: button }));
      expect(await screen.findByRole('header', { name: title })).toBeOnTheScreen();
      expect(screen.getByText('Em breve')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
      expect(await screen.findByRole('header', { name: 'Olá, Visitante' })).toBeOnTheScreen();
    }
  });

  it('os blocos do administrador abrem as áreas "Em breve"', async () => {
    await renderApp();
    await login(sampleAdmin);
    await screen.findByRole('header', { name: 'Administração' });

    await fireEvent.press(screen.getByRole('button', { name: /^Locais e terminais,/ }));
    expect(await screen.findByRole('header', { name: 'Locais e terminais' })).toBeOnTheScreen();
    expect(screen.getByText('Esta tela chega na etapa F06 do app.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Abrir catraca' }));
    expect(await screen.findByText('Esta tela chega na etapa F10 do app.')).toBeOnTheScreen();
  });

  it('endereço de área que não existe volta ao início', async () => {
    await SecureStore.setItemAsync(TOKEN_KEY, 'token-salvo');
    answerMe(sampleCondomino);
    await renderApp('/em-breve/qualquer-coisa');

    expect(await screen.findByRole('header', { name: 'Olá, Condômino' })).toBeOnTheScreen();
  });
});

describe('administração de usuários (F05)', () => {
  beforeEach(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    useSessionStore.setState({ token: null, usuario: null, expired: false });
    server.use(...usersHandlers(new FakeUserDirectory(), sampleAdmin.id));
  });

  const openUsers = async () => {
    await renderApp();
    await login(sampleAdmin);
    await fireEvent.press(await screen.findByRole('button', { name: /^Usuários,/ }));
    expect(await screen.findByRole('header', { name: 'Usuários' })).toBeOnTheScreen();
  };

  // The row of a user: its accessible name starts with the name and a comma.
  const rowName = (nome: string) => new RegExp(`^${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},`);
  const row = (nome: string) => screen.findByRole('button', { name: rowName(nome) });

  it('o bloco "Usuários" abre a lista com os ativos, e o voltar retorna ao início', async () => {
    await openUsers();

    expect(await row('Administrador (dev)')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Eduarda Martins,/ })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(await screen.findByRole('header', { name: 'Administração' })).toBeOnTheScreen();
  });

  it('cria um usuário: o e-mail repetido aparece no campo e, corrigido, ele entra na lista', async () => {
    await openUsers();
    await fireEvent.press(screen.getByRole('button', { name: 'Novo usuário' }));
    expect(await screen.findByRole('header', { name: 'Novo usuário' })).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Nome completo'), 'Aaron Teste');
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'condomino@dev.local');
    await fireEvent.press(screen.getByRole('radio', { name: 'Visitante' }));
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'Senha-Valida-123');
    await fireEvent.changeText(screen.getByLabelText('Confirmar senha'), 'Senha-Valida-123');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Este e-mail já está cadastrado.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'aaron@email.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('header', { name: 'Usuários' })).toBeOnTheScreen();
    expect(await row('Aaron Teste')).toBeOnTheScreen();
    expect(screen.getByText('Usuário cadastrado.')).toBeOnTheScreen();
  });

  it('desativar a si mesmo mostra a mensagem amigável e não sai da tela', async () => {
    await openUsers();
    await fireEvent.press(await row('Administrador (dev)'));

    await fireEvent.press(await screen.findByRole('switch', { name: 'Usuário ativo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Você não pode desativar a si mesmo.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Editar usuário' })).toBeOnTheScreen();
  });

  it('desativa outra pessoa: ela sai da lista e volta com "Mostrar usuários inativos"', async () => {
    await openUsers();
    await fireEvent.press(await row('Condômino (dev)'));
    await fireEvent.press(await screen.findByRole('switch', { name: 'Usuário ativo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Alterações salvas.')).toBeOnTheScreen();
    await screen.findByRole('header', { name: 'Usuários' });
    // The list refetches in the background: the old page shows for a moment.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: rowName('Condômino (dev)') })).toBeNull(),
    );

    await fireEvent.press(screen.getByRole('switch', { name: 'Mostrar usuários inativos' }));
    expect(
      await screen.findByRole('button', {
        name: 'Condômino (dev), condomino@dev.local, Condômino, Inativo',
      }),
    ).toBeOnTheScreen();
  });

  it('"Cancelar" com alterações pergunta, e "Descartar" volta para a lista', async () => {
    await openUsers();
    await fireEvent.press(screen.getByRole('button', { name: 'Novo usuário' }));
    await fireEvent.changeText(await screen.findByLabelText('Nome completo'), 'Alguém');

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    await pressLast('Descartar');

    expect(await screen.findByRole('header', { name: 'Usuários' })).toBeOnTheScreen();
    expect(router.canGoBack()).toBe(true);
  });
});
