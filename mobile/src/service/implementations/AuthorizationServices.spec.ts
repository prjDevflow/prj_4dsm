import { http, HttpResponse } from 'msw';
import { useSessionStore } from '@/context/SessionStore';
import type { Autorizacao } from '@/lib/types/authorizations';
import { API_URL } from '@test/msw/handlers';
import { server } from '@test/msw/server';
import { CreateAuthorizationService } from './AuthorizationServices';

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
