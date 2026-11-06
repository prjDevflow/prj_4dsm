import { delay, http, HttpResponse } from 'msw';
import { useSessionStore } from '@/context/SessionStore';
import { API_URL } from '@test/msw/handlers';
import { server } from '@test/msw/server';
import { ApiError } from './ApiError';
import { AxiosInstance, createAxiosInstance } from './AxiosInstance';

const usuario = {
  id: '7f8a1c2e-0000-4000-8000-000000000001',
  nome: 'Maria Souza',
  email: 'visitante@dev.local',
  perfil: 'VISITANTE' as const,
};

const captureError = async (promise: Promise<unknown>): Promise<ApiError> => {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('a requisição deveria falhar');
};

describe('AxiosInstance', () => {
  beforeEach(() => {
    useSessionStore.setState({ token: null, usuario: null, expired: false });
  });

  it('usa a URL do env e tempo limite de 10 s', () => {
    expect(AxiosInstance.defaults.baseURL).toBe(API_URL);
    expect(AxiosInstance.defaults.timeout).toBe(10_000);
  });

  it('envia Authorization: Bearer <token> quando há sessão', async () => {
    let authorization: string | null = 'não chamado';
    server.use(
      http.get(`${API_URL}/auth/me`, ({ request }) => {
        authorization = request.headers.get('authorization');
        return HttpResponse.json(usuario);
      }),
    );
    useSessionStore.setState({ token: 'token-123', usuario });

    await AxiosInstance.get('/auth/me');

    expect(authorization).toBe('Bearer token-123');
  });

  it('não envia Authorization quando não há sessão', async () => {
    let authorization: string | null = 'não chamado';
    server.use(
      http.get(`${API_URL}/health`, ({ request }) => {
        authorization = request.headers.get('authorization');
        return HttpResponse.json({ status: 'ok' });
      }),
    );

    await AxiosInstance.get('/health');

    expect(authorization).toBeNull();
  });

  it('converte o corpo { error: { code, message, details } } em ApiError com os mesmos campos', async () => {
    server.use(
      http.post(`${API_URL}/users`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Dados inválidos',
              details: [{ field: 'email', message: 'E-mail inválido' }],
            },
          },
          { status: 422 },
        ),
      ),
    );

    const error = await captureError(AxiosInstance.post('/users', {}));

    expect(error).toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos',
      details: [{ field: 'email', message: 'E-mail inválido' }],
    });
  });

  it('erro sem o corpo do contrato vira INTERNAL_ERROR com o status recebido', async () => {
    server.use(
      http.get(`${API_URL}/health`, () => new HttpResponse('Bad Gateway', { status: 502 })),
    );

    const error = await captureError(AxiosInstance.get('/health'));

    expect(error).toMatchObject({ status: 502, code: 'INTERNAL_ERROR', details: [] });
  });

  it('sem resposta do servidor vira ApiError NETWORK', async () => {
    server.use(http.get(`${API_URL}/health`, () => HttpResponse.error()));

    const error = await captureError(AxiosInstance.get('/health'));

    expect(error).toMatchObject({ status: null, code: 'NETWORK' });
  });

  it('tempo esgotado vira ApiError TIMEOUT', async () => {
    server.use(
      http.get(`${API_URL}/health`, async () => {
        await delay(200);
        return HttpResponse.json({ status: 'ok' });
      }),
    );
    const client = createAxiosInstance({ baseURL: API_URL, timeout: 20 });

    const error = await captureError(client.get('/health'));

    expect(error).toMatchObject({ status: null, code: 'TIMEOUT' });
  });

  it('401 com sessão aberta chama expireSession', async () => {
    server.use(
      http.get(`${API_URL}/auth/me`, () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Token ausente, inválido ou expirado' } },
          { status: 401 },
        ),
      ),
    );
    const expireSession = jest.fn();
    useSessionStore.setState({ token: 'token-vencido', usuario, expireSession });

    const error = await captureError(AxiosInstance.get('/auth/me'));

    expect(error.code).toBe('UNAUTHORIZED');
    expect(expireSession).toHaveBeenCalledTimes(1);
  });

  it('401 sem sessão (login com senha errada) não chama expireSession', async () => {
    server.use(
      http.post(`${API_URL}/auth/login`, () =>
        HttpResponse.json(
          { error: { code: 'CREDENCIAIS_INVALIDAS', message: 'E-mail ou senha inválidos' } },
          { status: 401 },
        ),
      ),
    );
    const expireSession = jest.fn();
    useSessionStore.setState({ token: null, usuario: null, expireSession });

    const error = await captureError(AxiosInstance.post('/auth/login', {}));

    expect(error.code).toBe('CREDENCIAIS_INVALIDAS');
    expect(expireSession).not.toHaveBeenCalled();
  });
});
