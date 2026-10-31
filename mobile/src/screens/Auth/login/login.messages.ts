import type { ApiError } from '@/service/ApiError';

// Texts of the login errors (04-steps, F03). The API code never reaches the screen.
export const loginErrorMessage = (error: ApiError): string => {
  switch (error.code) {
    case 'CREDENCIAIS_INVALIDAS':
      return 'E-mail ou senha incorretos. Confira e tente de novo.';
    case 'USUARIO_INATIVO':
      return 'Seu cadastro está inativo. Procure a administração.';
    case 'RATE_LIMITED':
      return 'Muitas tentativas. Aguarde um minuto e tente de novo.';
    case 'NETWORK':
    case 'TIMEOUT':
      return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
    default:
      return 'Não foi possível entrar agora. Tente novamente em instantes.';
  }
};
