import { useEffect, useState } from 'react';
import { useSessionStore } from '@/context/SessionStore';
import { tokenStorage } from '@/context/tokenStorage';
import { ApiError } from '@/service/ApiError';
import type { IGetMeService } from '@/service/IAuthService';

type SplashModelProps = {
  getMeService: IGetMeService;
};

export type SplashStatus = 'checking' | 'ready' | 'error';

type Outcome = { status: 'ready' } | { status: 'error'; message: string };

const OFFLINE_MESSAGE = 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
const SERVER_MESSAGE = 'Não foi possível abrir sua sessão agora. Tente novamente em instantes.';

/** Reads the saved token and asks the server who it belongs to. */
const restoreSession = async (getMeService: IGetMeService): Promise<Outcome> => {
  const token = await tokenStorage.load();
  if (!token) return { status: 'ready' };

  const session = useSessionStore.getState();
  session.resume(token);
  try {
    session.setUsuario(await getMeService.exec());
    return { status: 'ready' };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // Expired token or deactivated account: back to the login with the notice.
      session.expireSession();
      return { status: 'ready' };
    }
    // No network: keep the token, the person tries again.
    const offline = error instanceof ApiError && ['NETWORK', 'TIMEOUT'].includes(error.code);
    return { status: 'error', message: offline ? OFFLINE_MESSAGE : SERVER_MESSAGE };
  }
};

// T01: restores the saved session (token + GET /auth/me) before any route opens.
export const useSplashModel = ({ getMeService }: SplashModelProps) => {
  const [status, setStatus] = useState<SplashStatus>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    restoreSession(getMeService).then((outcome) => {
      if (!active) return;
      setStatus(outcome.status);
      setErrorMessage(outcome.status === 'error' ? outcome.message : null);
    });
    return () => {
      active = false;
    };
  }, [getMeService, attempt]);

  const onRetry = () => {
    setStatus('checking');
    setErrorMessage(null);
    setAttempt((current) => current + 1);
  };

  return { status, errorMessage, onRetry };
};
