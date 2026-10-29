import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { useSessionStore } from '@/context/SessionStore';
import { TOKEN_KEY } from '@/context/tokenStorage';
import { ApiError } from '@/service/ApiError';
import { FakeLoginUserService } from '@/service/fakes/FakeLoginUserService';
import { sampleLoginResponse } from '@/service/fakes/sampleData';
import type { ILoginUserService } from '@/service/IAuthService';
import { createWrapper } from '@test/renderWithProviders';
import { useLoginModel } from './login.model';

const renderModel = (service: ILoginUserService) =>
  renderHook(() => useLoginModel({ loginUserService: service }), { wrapper: createWrapper() });

type Model = ReturnType<typeof useLoginModel>;

const fill = async (model: { current: Model }, email: string, senha: string) => {
  await act(() => {
    model.current.form.setValue('email', email);
    model.current.form.setValue('senha', senha);
  });
};

const submit = (model: { current: Model }) =>
  act(() => model.current.form.handleSubmit(model.current.onSubmit)());

describe('useLoginModel', () => {
  beforeEach(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    useSessionStore.setState({ token: null, usuario: null, expired: false });
  });

  it('campos vazios mostram as duas mensagens e não chamam o serviço', async () => {
    const service = new FakeLoginUserService();
    const { result } = await renderModel(service);

    await submit(result);

    expect(service.calls).toHaveLength(0);
    expect(result.current.form.getFieldState('email').error?.message).toBe('Informe seu e-mail.');
    expect(result.current.form.getFieldState('senha').error?.message).toBe('Informe sua senha.');
  });

  it('e-mail sem "@" mostra a mensagem de formato e não envia', async () => {
    const service = new FakeLoginUserService();
    const { result } = await renderModel(service);

    await fill(result, 'admin.dev.local', 'Admin-Dev-2026');
    await submit(result);

    expect(service.calls).toHaveLength(0);
    expect(result.current.form.getFieldState('email').error?.message).toBe(
      'Digite um e-mail válido. Exemplo: nome@email.com',
    );
  });

  it('envia o e-mail sem espaços e em minúsculas, guarda o token e abre a sessão', async () => {
    const service = new FakeLoginUserService();
    const { result } = await renderModel(service);

    await fill(result, '  Admin@Dev.Local ', 'Admin-Dev-2026');
    await submit(result);

    await waitFor(() => expect(useSessionStore.getState().usuario?.perfil).toBe('ADMIN'));
    expect(service.calls).toEqual([{ email: 'admin@dev.local', senha: 'Admin-Dev-2026' }]);
    expect(await SecureStore.getItemAsync(TOKEN_KEY)).toBe(sampleLoginResponse.accessToken);
  });

  it.each([
    ['CREDENCIAIS_INVALIDAS', 401, 'E-mail ou senha incorretos. Confira e tente de novo.'],
    ['USUARIO_INATIVO', 403, 'Seu cadastro está inativo. Procure a administração.'],
    ['RATE_LIMITED', 429, 'Muitas tentativas. Aguarde um minuto e tente de novo.'],
    ['NETWORK', null, 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'],
    ['INTERNAL_ERROR', 500, 'Não foi possível entrar agora. Tente novamente em instantes.'],
  ])(
    'erro %s mostra a mensagem, limpa a senha, mantém o e-mail e foca a senha',
    async (code, status, message) => {
      const service = new FakeLoginUserService();
      service.willFail(new ApiError(status, code, 'texto do servidor'));
      const { result } = await renderModel(service);
      const setFocus = jest.spyOn(result.current.form, 'setFocus');

      await fill(result, 'admin@dev.local', 'senha-errada');
      await submit(result);

      await waitFor(() => expect(result.current.apiError).toBe(message));
      expect(result.current.form.getValues()).toEqual({ email: 'admin@dev.local', senha: '' });
      expect(setFocus).toHaveBeenCalledWith('senha');
      expect(result.current.isSubmitting).toBe(false);
      expect(useSessionStore.getState().usuario).toBeNull();
    },
  );

  it('só foca a senha depois que os campos voltam a ficar habilitados', async () => {
    const service = new FakeLoginUserService();
    service.willFail(new ApiError(401, 'CREDENCIAIS_INVALIDAS', ''));
    const { result } = await renderModel(service);
    const submittingWhenFocused: boolean[] = [];
    jest
      .spyOn(result.current.form, 'setFocus')
      .mockImplementation(() => submittingWhenFocused.push(result.current.isSubmitting));

    await fill(result, 'admin@dev.local', 'errada');
    await submit(result);

    await waitFor(() => expect(submittingWhenFocused).toEqual([false]));
  });

  it('toque duplo em "Entrar" chama o serviço uma vez só', async () => {
    let finish: () => void = () => {};
    const exec = jest.fn(
      () =>
        new Promise<typeof sampleLoginResponse>((resolve) => {
          finish = () => resolve(sampleLoginResponse);
        }),
    );
    const { result } = await renderModel({ exec });
    await fill(result, 'admin@dev.local', 'Admin-Dev-2026');

    await act(async () => {
      const send = result.current.form.handleSubmit(result.current.onSubmit);
      await Promise.all([send(), send()]);
    });
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => finish());
    await waitFor(() => expect(useSessionStore.getState().usuario).not.toBeNull());
    expect(exec).toHaveBeenCalledTimes(1);
  });

  it('avisa quando a sessão anterior expirou', async () => {
    useSessionStore.setState({ expired: true });
    const { result } = await renderModel(new FakeLoginUserService());

    expect(result.current.sessionExpired).toBe(true);
  });
});
