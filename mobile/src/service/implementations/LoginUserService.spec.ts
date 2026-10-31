import { http, HttpResponse } from 'msw';
import { useSessionStore } from '@/context/SessionStore';
import { API_URL } from '@test/msw/handlers';
import { server } from '@test/msw/server';
import { LoginUserService } from './LoginUserService';

const loginResponse = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.teste',
  tokenType: 'Bearer',
  expiresIn: 43200,
  usuario: {
    id: '5eed0000-0000-4000-8000-000000000001',
    nome: 'Administrador',
    email: 'admin@dev.local',
    perfil: 'ADMIN',
  },
};

describe('LoginUserService', () => {
  beforeEach(() => useSessionStore.setState({ token: null, usuario: null, expired: false }));

  it('chama POST /auth/login com { email, senha } e devolve o token e o usuário', async () => {
    let request: { method: string; body: unknown } | null = null;
    server.use(
      http.post(`${API_URL}/auth/login`, async ({ request: req }) => {
        request = { method: req.method, body: await req.json() };
        return HttpResponse.json(loginResponse);
      }),
    );

    const result = await new LoginUserService().exec('admin@dev.local', 'Admin-Dev-2026');

    expect(request).toEqual({
      method: 'POST',
      body: { email: 'admin@dev.local', senha: 'Admin-Dev-2026' },
    });
    expect(result).toEqual(loginResponse);
  });

  it('401 vira ApiError CREDENCIAIS_INVALIDAS e não marca sessão expirada', async () => {
    server.use(
      http.post(`${API_URL}/auth/login`, () =>
        HttpResponse.json(
          { error: { code: 'CREDENCIAIS_INVALIDAS', message: 'E-mail ou senha inválidos' } },
          { status: 401 },
        ),
      ),
    );

    await expect(new LoginUserService().exec('admin@dev.local', 'errada')).rejects.toMatchObject({
      status: 401,
      code: 'CREDENCIAIS_INVALIDAS',
    });
    expect(useSessionStore.getState().expired).toBe(false);
  });

  it('429 vira ApiError RATE_LIMITED', async () => {
    server.use(
      http.post(`${API_URL}/auth/login`, () =>
        HttpResponse.json(
          { error: { code: 'RATE_LIMITED', message: 'Muitas tentativas' } },
          { status: 429 },
        ),
      ),
    );

    await expect(new LoginUserService().exec('admin@dev.local', 'x')).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
    });
  });
});
