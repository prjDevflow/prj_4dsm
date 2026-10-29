import type { LoginResponse } from '@/lib/types/auth';
import { ApiError } from '../ApiError';
import type { ILoginUserService } from '../IAuthService';
import { sampleLoginResponses } from './sampleData';

/**
 * Accepts the seed users (backend/.env.example) and answers like the API: wrong password → 401.
 * In tests, willFail/willReturn fix the answer.
 */
export class FakeLoginUserService implements ILoginUserService {
  readonly calls: { email: string; senha: string }[] = [];
  private fixed: LoginResponse | ApiError | null = null;

  willFail(error: ApiError) {
    this.fixed = error;
  }

  willReturn(response: LoginResponse) {
    this.fixed = response;
  }

  async exec(email: string, senha: string): Promise<LoginResponse> {
    this.calls.push({ email, senha });
    if (this.fixed instanceof ApiError) throw this.fixed;
    if (this.fixed) return this.fixed;

    const account = sampleLoginResponses[email];
    if (!account || account.senha !== senha) {
      throw new ApiError(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha inválidos');
    }
    return account.response;
  }
}
