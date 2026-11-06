import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { useSessionStore } from '@/context/SessionStore';
import { ApiError } from '@/service/ApiError';
import { FakeLoginUserService } from '@/service/fakes/FakeLoginUserService';
import { createWrapper } from '@test/renderWithProviders';
import { useLoginModel } from './login.model';
import { LoginView } from './login.view';

type ScreenProps = {
  service: FakeLoginUserService;
  showDevTools?: boolean;
  onOpenDevTools?: () => void;
};

// The real page wires the container; here the same model gets a fake service.
const LoginScreen = ({
  service,
  showDevTools = false,
  onOpenDevTools = jest.fn(),
}: ScreenProps) => {
  const methods = useLoginModel({ loginUserService: service });
  return (
    <LoginView
      {...methods}
      appVersion="0.1.0"
      showDevTools={showDevTools}
      onOpenDevTools={onOpenDevTools}
    />
  );
};

const renderLogin = (props: ScreenProps) =>
  render(<LoginScreen {...props} />, { wrapper: createWrapper() });

describe('LoginView', () => {
  beforeEach(() => useSessionStore.setState({ token: null, usuario: null, expired: false }));

  it('mostra o topo do Figma, a ajuda e a versão', async () => {
    await renderLogin({ service: new FakeLoginUserService() });

    expect(screen.getByText('Passe')).toBeOnTheScreen();
    expect(screen.getByText('Controle de Acesso')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Entre com sua conta' })).toBeOnTheScreen();
    expect(screen.getByText('Problemas para entrar? Procure a administração.')).toBeOnTheScreen();
    expect(screen.getByText('Versão 0.1.0')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ferramentas de desenvolvimento' })).toBeNull();
  });

  it('o campo de e-mail tem teclado de e-mail, sem maiúscula nem correção, e leva à senha', async () => {
    await renderLogin({ service: new FakeLoginUserService() });

    expect(screen.getByLabelText('E-mail').props).toMatchObject({
      keyboardType: 'email-address',
      autoCapitalize: 'none',
      autoCorrect: false,
      returnKeyType: 'next',
      maxLength: 254,
    });
    expect(screen.getByLabelText('Senha').props).toMatchObject({
      secureTextEntry: true,
      returnKeyType: 'go',
      maxLength: 72,
    });
  });

  it('"Entrar" com os campos vazios mostra as duas mensagens e não envia nada', async () => {
    const service = new FakeLoginUserService();
    await renderLogin({ service });

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe seu e-mail.')).toBeOnTheScreen();
    expect(screen.getByText('Informe sua senha.')).toBeOnTheScreen();
    expect(service.calls).toHaveLength(0);
  });

  it('credenciais erradas mostram a faixa de alerta, limpam a senha e mantêm o e-mail', async () => {
    const service = new FakeLoginUserService();
    await renderLogin({ service });

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'admin@dev.local');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'errada');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText('E-mail ou senha incorretos. Confira e tente de novo.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Senha').props.value).toBe('');
    expect(screen.getByLabelText('E-mail').props.value).toBe('admin@dev.local');
  });

  it('a faixa de erro some quando a pessoa digita de novo', async () => {
    const service = new FakeLoginUserService();
    service.willFail(new ApiError(null, 'NETWORK', 'Sem conexão'));
    await renderLogin({ service });

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'admin@dev.local');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'Admin-Dev-2026');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(
      await screen.findByText(
        'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
      ),
    ).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Senha'), 'A');

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('enquanto envia, o botão mostra "Entrando…", fica ocupado e os campos ficam bloqueados', async () => {
    const service = new FakeLoginUserService();
    let finish: () => void = () => {};
    jest.spyOn(service, 'exec').mockImplementation(
      () =>
        new Promise((_, reject) => {
          finish = () => reject(new ApiError(500, 'INTERNAL_ERROR', ''));
        }),
    );
    await renderLogin({ service });

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'admin@dev.local');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'Admin-Dev-2026');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('button', { name: 'Entrando…' })).toBeBusy();
    expect(screen.getByLabelText('E-mail').props.editable).toBe(false);
    expect(screen.getByLabelText('Senha').props.editable).toBe(false);
    finish();
    expect(await screen.findByRole('button', { name: 'Entrar' })).not.toBeBusy();
  });

  it('"Mostrar" revela a senha e "Ocultar" esconde, sem perder o texto', async () => {
    await renderLogin({ service: new FakeLoginUserService() });

    await fireEvent.changeText(screen.getByLabelText('Senha'), 'Admin-Dev-2026');
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(screen.getByLabelText('Senha').props).toMatchObject({
      secureTextEntry: false,
      value: 'Admin-Dev-2026',
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
  });

  it('avisa que a sessão expirou quando a pessoa foi deslogada por um 401', async () => {
    useSessionStore.setState({ expired: true });
    await renderLogin({ service: new FakeLoginUserService() });

    expect(
      within(screen.getByRole('alert')).getByText('Sua sessão expirou. Entre novamente.'),
    ).toBeOnTheScreen();
  });

  it('em desenvolvimento, mostra o atalho para as ferramentas (API e catálogo)', async () => {
    const onOpenDevTools = jest.fn();
    await renderLogin({ service: new FakeLoginUserService(), showDevTools: true, onOpenDevTools });

    await fireEvent.press(screen.getByRole('button', { name: 'Ferramentas de desenvolvimento' }));

    expect(onOpenDevTools).toHaveBeenCalledTimes(1);
  });
});
