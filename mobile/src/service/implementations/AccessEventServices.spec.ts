import { http, HttpResponse } from 'msw';
import { API_URL } from '@test/msw/handlers';
import { server } from '@test/msw/server';
import { ListAccessEventsService, ListMyAccessEventsService } from './AccessEventServices';

const page = { data: [], page: 1, pageSize: 20, total: 0 };

const capture = (path: string) => {
  const seen: Record<string, string>[] = [];
  server.use(
    http.get(`${API_URL}${path}`, ({ request }) => {
      seen.push(Object.fromEntries(new URL(request.url).searchParams));
      return HttpResponse.json(page);
    }),
  );
  return seen;
};

describe('serviços do histórico', () => {
  it('GET /access-events leva cada filtro como parâmetro, com o + do fuso codificado', async () => {
    const seen = capture('/access-events');

    await expect(
      new ListAccessEventsService().exec({
        usuarioId: 'u1',
        accessPointId: 'p1',
        metodo: 'NFC',
        resultado: 'NEGADO',
        motivo: 'TAG_DESCONHECIDA',
        de: '2026-10-18T00:00:00-03:00',
        ate: '2026-10-24T23:59:59.999-03:00',
        page: 2,
        pageSize: 20,
      }),
    ).resolves.toEqual(page);

    expect(seen).toEqual([
      {
        usuarioId: 'u1',
        accessPointId: 'p1',
        metodo: 'NFC',
        resultado: 'NEGADO',
        motivo: 'TAG_DESCONHECIDA',
        de: '2026-10-18T00:00:00-03:00',
        ate: '2026-10-24T23:59:59.999-03:00',
        page: '2',
        pageSize: '20',
      },
    ]);
  });

  it('filtros vazios não vão na URL', async () => {
    const seen = capture('/access-events');

    await new ListAccessEventsService().exec({ page: 1, pageSize: 20 });

    expect(seen).toEqual([{ page: '1', pageSize: '20' }]);
  });

  it('GET /me/access-events traz só as próprias tentativas', async () => {
    const seen = capture('/me/access-events');

    await expect(new ListMyAccessEventsService().exec({ page: 1, pageSize: 20 })).resolves.toEqual(
      page,
    );

    expect(seen).toEqual([{ page: '1', pageSize: '20' }]);
  });
});
