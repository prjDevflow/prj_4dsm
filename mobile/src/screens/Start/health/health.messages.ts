import type { ApiError } from '@/service/ApiError';

export const healthErrorMessage = (error: ApiError): string => {
  switch (error.code) {
    case 'NETWORK':
    case 'TIMEOUT':
      return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
    default:
      return 'Não foi possível falar com a API agora. Tente novamente em instantes.';
  }
};
