import { ApiError } from '@/service/ApiError';
import { loginErrorMessage } from './login.messages';

describe('loginErrorMessage', () => {
  it.each([
    [401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos. Confira e tente de novo.'],
    [403, 'USUARIO_INATIVO', 'Seu cadastro está inativo. Procure a administração.'],
    [429, 'RATE_LIMITED', 'Muitas tentativas. Aguarde um minuto e tente de novo.'],
    [null, 'NETWORK', 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'],
    [null, 'TIMEOUT', 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'],
    [500, 'INTERNAL_ERROR', 'Não foi possível entrar agora. Tente novamente em instantes.'],
    [422, 'VALIDATION_ERROR', 'Não foi possível entrar agora. Tente novamente em instantes.'],
    [418, 'ALGO_NOVO', 'Não foi possível entrar agora. Tente novamente em instantes.'],
  ])('%s %s mostra "%s" (nunca o código)', (status, code, message) => {
    expect(loginErrorMessage(new ApiError(status, code, 'texto do servidor'))).toBe(message);
  });
});
