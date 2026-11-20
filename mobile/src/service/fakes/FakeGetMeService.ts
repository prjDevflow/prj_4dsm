import { useSessionStore } from '@/context/SessionStore';
import type { Usuario } from '@/lib/types/auth';
import { ApiError } from '../ApiError';
import type { IGetMeService } from '../IAuthService';
import { sampleLoginResponses } from './sampleData';

/** Answers with the seed user of the session token (or the one given); willFail sets the error. */
export class FakeGetMeService implements IGetMeService {
  calls = 0;
  readonly tokensSeen: (string | null)[] = [];
  private result: Usuario | ApiError | null;

  constructor(usuario: Usuario | null = null) {
    this.result = usuario;
  }

  willFail(error: ApiError) {
    this.result = error;
  }

  willReturn(usuario: Usuario) {
    this.result = usuario;
  }

  async exec(): Promise<Usuario> {
    this.calls += 1;
    const token = useSessionStore.getState().token;
    this.tokensSeen.push(token);
    if (this.result instanceof ApiError) throw this.result;
    if (this.result) return this.result;

    const account = Object.values(sampleLoginResponses).find(
      ({ response }) => response.accessToken === token,
    );
    if (!account) throw new ApiError(401, 'UNAUTHORIZED', 'Token ausente, inválido ou expirado');
    return account.response.usuario;
  }
}
