import { http, HttpResponse } from 'msw';
import { useSessionStore } from '@/context/SessionStore';
import type { Autorizacao } from '@/lib/types/authorizations';
import { API_URL } from '@test/msw/handlers';
import { server } from '@test/msw/server';
import {
  CancelAuthorizationService,
  CreateAuthorizationService,
  GetAuthorizationService,
  ListAuthorizationsService,
} from './AuthorizationServices';

// Example of backend/openapi.yaml.
const created: Autorizacao = {
  id: '5eed0000-0000-4000-8000-000000000008',
  usuario: { id: '5eed0000-0000-4000-8000-000000000002', nome: 'Maria Souza', perfil: 'VISITANTE' },
  local: {
    id: '5eed0000-0000-4000-8000-000000000005',
    nome: 'Catraca Social',
    tipo: 'CATRACA',
    edificio: { id: '5eed0000-0000-4000-8000-000000000004', nome: 'Edifício Central' },
  },
  dataInicio: '2026-10-20',
  dataFim: '2026-10-25',
  horaInicio: '08:00',
  horaFim: '18:00',
  usosPermitidos: 3,
  usosRealizados: 0,
  usosRestantes: 3,
  situacao: 'ATIVA',
  situacaoEfetiva: 'ATIVA',
  criadoPor: { id: '5eed0000-0000-4000-8000-000000000001', nome: 'Administrador' },
  criadoEm: '2026-10-19T12:00:00.000Z',
  canceladoPor: null,
  canceladoEm: null,
  motivoCancelamento: null,
};

const body = {
  usuarioId: created.usuario.id,
  accessPointId: created.local.id,
  dataInicio: '2026-10-20',
  dataFim: '2026-10-25',
  horaInicio: '08:00',
  horaFim: '18:00',
  usosPermitidos: 3,
};

describe('CreateAuthorizationService', () => {
  beforeEach(() =>
    useSessionStore.setState({ token: 'token-admin', usuario: null, expired: false }),
  );

  it('chama POST /authorizations com os oito campos e devolve a autorização ativa', async () => {
    let request: { method: string; body: unknown; authorization: string | null } | null = null;
    server.use(
      http.post(`${API_URL}/authorizations`, async ({ request: req }) => {
        request = {
          method: req.method,
          body: await req.json(),
          authorization: req.headers.get('authorization'),
        };
        return HttpResponse.json(created, { status: 201 });
      }),
    );

    const result = await new CreateAuthorizationService().exec(body);

    expect(request).toEqual({ method: 'POST', body, authorization: 'Bearer token-admin' });
    expect(result.situacaoEfetiva).toBe('ATIVA');
  });

  it('422 traz os details de cada campo', async () => {
    const details = [{ field: 'dataFim', message: 'não pode estar no passado' }];
    server.use(
      http.post(`${API_URL}/authorizations`, () =>
        HttpResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details } },
          { status: 422 },
        ),
      ),
    );

    await expect(new CreateAuthorizationService().exec(body)).rejects.toMatchObject({
      status: 422,
      details,
    });
  });

  it('404 (pessoa ou local que não existe) vira ApiError NOT_FOUND', async () => {
    server.use(
      http.post(`${API_URL}/authorizations`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Usuário não encontrado' } },
          { status: 404 },
        ),
      ),
    );

    await expect(new CreateAuthorizationService().exec(body)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('consulta e cancelamento de autorizações', () => {
  beforeEach(() =>
    useSessionStore.setState({ token: 'token-admin', usuario: null, expired: false }),
  );

  it('ListAuthorizationsService: GET /authorizations com todos os filtros e a página', async () => {
    let query = {};
    const page = { data: [created], page: 2, pageSize: 20, total: 21 };
    server.use(
      http.get(`${API_URL}/authorizations`, ({ request }) => {
        query = Object.fromEntries(new URL(request.url).searchParams);
        return HttpResponse.json(page);
      }),
    );

    const result = await new ListAuthorizationsService().exec({
      usuarioId: 'u-1',
      accessPointId: 'ap-1',
      situacao: 'ATIVA',
      dataDe: '2026-10-01',
      dataAte: '2026-10-31',
      page: 2,
      pageSize: 20,
    });

    expect(query).toEqual({
      usuarioId: 'u-1',
      accessPointId: 'ap-1',
      situacao: 'ATIVA',
      dataDe: '2026-10-01',
      dataAte: '2026-10-31',
      page: '2',
      pageSize: '20',
    });
    expect(result).toEqual(page);
  });

  it('ListAuthorizationsService: não envia os filtros vazios', async () => {
    let query = {};
    server.use(
      http.get(`${API_URL}/authorizations`, ({ request }) => {
        query = Object.fromEntries(new URL(request.url).searchParams);
        return HttpResponse.json({ data: [], page: 1, pageSize: 20, total: 0 });
      }),
    );

    await new ListAuthorizationsService().exec({ page: 1, pageSize: 20 });

    expect(query).toEqual({ page: '1', pageSize: '20' });
  });

  it('GetAuthorizationService: GET /authorizations/:id', async () => {
    let path = '';
    server.use(
      http.get(`${API_URL}/authorizations/:id`, ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json(created);
      }),
    );

    await expect(new GetAuthorizationService().exec(created.id)).resolves.toEqual(created);
    expect(path).toBe(`/api/v1/authorizations/${created.id}`);
  });

  it('CancelAuthorizationService: PATCH /authorizations/:id/cancel com o motivo', async () => {
    let request: { method: string; path: string; body: unknown } | null = null;
    const cancelled = { ...created, situacao: 'CANCELADA', situacaoEfetiva: 'CANCELADA' };
    server.use(
      http.patch(`${API_URL}/authorizations/:id/cancel`, async ({ request: req }) => {
        request = {
          method: req.method,
          path: new URL(req.url).pathname,
          body: await req.json(),
        };
        return HttpResponse.json(cancelled);
      }),
    );

    await expect(
      new CancelAuthorizationService().exec(created.id, 'Pedido da moradora'),
    ).resolves.toEqual(cancelled);
    expect(request).toEqual({
      method: 'PATCH',
      path: `/api/v1/authorizations/${created.id}/cancel`,
      body: { motivo: 'Pedido da moradora' },
    });
  });

  it('CancelAuthorizationService: sem motivo envia o corpo vazio', async () => {
    let body: unknown = null;
    server.use(
      http.patch(`${API_URL}/authorizations/:id/cancel`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(created);
      }),
    );

    await new CancelAuthorizationService().exec(created.id);

    expect(body).toEqual({});
  });
});
