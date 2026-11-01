import { http, HttpResponse } from 'msw';
import { useSessionStore } from '@/context/SessionStore';
import { sampleCondomino } from '@/service/fakes/sampleData';
import { API_URL } from '@test/msw/handlers';
import { server } from '@test/msw/server';
import { GetMeService } from './GetMeService';

describe('GetMeService', () => {
  beforeEach(() =>
    useSessionStore.setState({ token: 'token-salvo', usuario: null, expired: false }),
  );

  it('chama GET /auth/me com o Bearer da sessão e devolve o usuário', async () => {
    let authorization: string | null = null;
    server.use(
      http.get(`${API_URL}/auth/me`, ({ request }) => {
        authorization = request.headers.get('authorization');
        return HttpResponse.json(sampleCondomino);
      }),
    );

    const usuario = await new GetMeService().exec();

    expect(authorization).toBe('Bearer token-salvo');
    expect(usuario).toEqual(sampleCondomino);
  });

  it('401 (token vencido ou conta desativada) vira ApiError e encerra a sessão', async () => {
    server.use(
      http.get(`${API_URL}/auth/me`, () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Token ausente, inválido ou expirado' } },
          { status: 401 },
        ),
      ),
    );

    await expect(new GetMeService().exec()).rejects.toMatchObject({ status: 401 });
    expect(useSessionStore.getState()).toMatchObject({ token: null, expired: true });
  });
});
