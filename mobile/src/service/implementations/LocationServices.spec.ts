import { http, HttpResponse } from 'msw';
import { useSessionStore } from '@/context/SessionStore';
import type { Edificio, PontoDeAcesso } from '@/lib/types/locations';
import { API_URL } from '@test/msw/handlers';
import { server } from '@test/msw/server';
import {
  CreateAccessPointService,
  CreateBuildingService,
  ListAccessPointsService,
  ListBuildingsService,
  UpdateAccessPointService,
  UpdateBuildingService,
} from './LocationServices';

// Examples of backend/openapi.yaml.
const central: Edificio = {
  id: '5eed0000-0000-4000-8000-000000000004',
  nome: 'Edifício Central',
  endereco: 'Rua das Acácias, 120',
  latitude: -23.30512,
  longitude: -45.96551,
  ativo: true,
};

const catraca: PontoDeAcesso = {
  id: '5eed0000-0000-4000-8000-000000000005',
  buildingId: central.id,
  tipo: 'CATRACA',
  nome: 'Catraca Social',
  identificacao: 'CAT-01',
  latitude: -23.30512,
  longitude: -45.96551,
  ativo: true,
};

type Seen = { method: string; path: string; query: Record<string, string>; body: unknown };

/** Answers `answer` and keeps what the app sent. */
const capture = (method: 'get' | 'post' | 'patch', path: string, answer: unknown, status = 200) => {
  const seen: Seen[] = [];
  server.use(
    http[method](`${API_URL}${path}`, async ({ request }) => {
      const url = new URL(request.url);
      seen.push({
        method: request.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        body: method === 'get' ? null : await request.json(),
      });
      return HttpResponse.json(answer as object, { status });
    }),
  );
  return seen;
};

describe('serviços de locais', () => {
  beforeEach(() =>
    useSessionStore.setState({ token: 'token-admin', usuario: null, expired: false }),
  );

  it('ListBuildingsService: GET /buildings com a página', async () => {
    const page = { data: [central], page: 1, pageSize: 100, total: 1 };
    const seen = capture('get', '/buildings', page);

    await expect(new ListBuildingsService().exec({ page: 1, pageSize: 100 })).resolves.toEqual(
      page,
    );
    expect(seen[0]).toMatchObject({ query: { page: '1', pageSize: '100' } });
  });

  it('CreateBuildingService: POST /buildings com o corpo', async () => {
    const body = {
      nome: 'Edifício Central',
      endereco: 'Rua das Acácias, 120',
      latitude: -23.30512,
      longitude: -45.96551,
      ativo: true,
    };
    const seen = capture('post', '/buildings', central, 201);

    await expect(new CreateBuildingService().exec(body)).resolves.toEqual(central);
    expect(seen[0]).toMatchObject({ method: 'POST', body });
  });

  it('UpdateBuildingService: PATCH /buildings/:id só com o corpo dado', async () => {
    const seen = capture('patch', '/buildings/:id', { ...central, ativo: false });

    await new UpdateBuildingService().exec(central.id, { ativo: false });
    expect(seen[0]).toMatchObject({
      method: 'PATCH',
      path: `/api/v1/buildings/${central.id}`,
      body: { ativo: false },
    });
  });

  it('ListAccessPointsService: GET /access-points com a página', async () => {
    const seen = capture('get', '/access-points', {
      data: [catraca],
      page: 2,
      pageSize: 100,
      total: 101,
    });

    const page = await new ListAccessPointsService().exec({ page: 2, pageSize: 100 });
    expect(page.data).toEqual([catraca]);
    expect(seen[0].query).toEqual({ page: '2', pageSize: '100' });
  });

  it('CreateAccessPointService: POST /access-points com o corpo', async () => {
    const { id: _id, ...body } = catraca;
    const seen = capture('post', '/access-points', catraca, 201);

    await expect(new CreateAccessPointService().exec(body)).resolves.toEqual(catraca);
    expect(seen[0].body).toEqual(body);
  });

  it('UpdateAccessPointService: 409 LOCAL_COM_AUTORIZACOES_ATIVAS vira ApiError com o código', async () => {
    capture(
      'patch',
      '/access-points/:id',
      {
        error: {
          code: 'LOCAL_COM_AUTORIZACOES_ATIVAS',
          message: 'Este local ainda tem autorizações ativas. Cancele-as antes.',
        },
      },
      409,
    );

    await expect(
      new UpdateAccessPointService().exec(catraca.id, { ativo: false }),
    ).rejects.toMatchObject({ status: 409, code: 'LOCAL_COM_AUTORIZACOES_ATIVAS' });
  });
});
