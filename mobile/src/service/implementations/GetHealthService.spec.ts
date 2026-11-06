import { http, HttpResponse } from 'msw';
import { API_URL } from '@test/msw/handlers';
import { server } from '@test/msw/server';
import { ApiError } from '../ApiError';
import { GetHealthService } from './GetHealthService';

describe('GetHealthService', () => {
  it('chama GET /health e devolve status e db', async () => {
    let method = '';
    server.use(
      http.get(`${API_URL}/health`, ({ request }) => {
        method = request.method;
        return HttpResponse.json({
          status: 'ok',
          version: '0.1.0',
          time: '2026-10-16T12:00:00.000Z',
          db: 'down',
        });
      }),
    );

    const health = await new GetHealthService().exec();

    expect(method).toBe('GET');
    expect(health).toEqual({
      status: 'ok',
      version: '0.1.0',
      time: '2026-10-16T12:00:00.000Z',
      db: 'down',
    });
  });

  it('API fora do ar vira ApiError NETWORK', async () => {
    server.use(http.get(`${API_URL}/health`, () => HttpResponse.error()));

    await expect(new GetHealthService().exec()).rejects.toMatchObject({ code: 'NETWORK' });
    await expect(new GetHealthService().exec()).rejects.toBeInstanceOf(ApiError);
  });
});
