import { http, HttpResponse } from 'msw';
import { useSessionStore } from '@/context/SessionStore';
import type { Terminal } from '@/lib/types/locations';
import { API_URL } from '@test/msw/handlers';
import { server } from '@test/msw/server';
import {
  CreateTerminalService,
  GetTerminalService,
  ListTerminalsService,
  RotateTerminalKeyService,
  UpdateTerminalService,
} from './TerminalServices';

// Examples of backend/openapi.yaml.
const terminal: Terminal = {
  id: '5eed0000-0000-4000-8000-000000000006',
  accessPointId: '5eed0000-0000-4000-8000-000000000005',
  nome: 'Terminal Social',
  ativo: true,
  online: true,
  ultimoContatoEm: '2026-10-25T14:32:07.000Z',
  ultimaLat: -23.30512,
  ultimaLon: -45.96551,
  gpsFix: true,
  gpsSimulado: false,
  firmware: '0.3.0',
  rssi: -61,
};

const key = { id: terminal.id, apiKey: 'q3F8k2Zr1pLw9XbTn0YhVAq3F8k2Zr1pLw9XbTn0Yh' };

describe('serviços de terminais', () => {
  beforeEach(() =>
    useSessionStore.setState({ token: 'token-admin', usuario: null, expired: false }),
  );

  it('ListTerminalsService: GET /terminals com a página', async () => {
    let query = {};
    server.use(
      http.get(`${API_URL}/terminals`, ({ request }) => {
        query = Object.fromEntries(new URL(request.url).searchParams);
        return HttpResponse.json({ data: [terminal], page: 1, pageSize: 100, total: 1 });
      }),
    );

    const page = await new ListTerminalsService().exec({ page: 1, pageSize: 100 });

    expect(page.data).toEqual([terminal]);
    expect(query).toEqual({ page: '1', pageSize: '100' });
  });

  it('GetTerminalService: GET /terminals/:id', async () => {
    let path = '';
    server.use(
      http.get(`${API_URL}/terminals/:id`, ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json(terminal);
      }),
    );

    await expect(new GetTerminalService().exec(terminal.id)).resolves.toEqual(terminal);
    expect(path).toBe(`/api/v1/terminals/${terminal.id}`);
  });

  it('CreateTerminalService: POST /terminals devolve o id e a chave', async () => {
    let body: unknown = null;
    server.use(
      http.post(`${API_URL}/terminals`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(key, { status: 201 });
      }),
    );

    await expect(
      new CreateTerminalService().exec({
        accessPointId: terminal.accessPointId,
        nome: 'Terminal Social',
      }),
    ).resolves.toEqual(key);
    expect(body).toEqual({ accessPointId: terminal.accessPointId, nome: 'Terminal Social' });
  });

  it('CreateTerminalService: 409 CONFLICT (o ponto já tem terminal) vira ApiError', async () => {
    server.use(
      http.post(`${API_URL}/terminals`, () =>
        HttpResponse.json(
          { error: { code: 'CONFLICT', message: 'Este ponto de acesso já tem um terminal' } },
          { status: 409 },
        ),
      ),
    );

    await expect(
      new CreateTerminalService().exec({ accessPointId: terminal.accessPointId, nome: 'Outro' }),
    ).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
  });

  it('UpdateTerminalService: PATCH /terminals/:id só com o corpo dado', async () => {
    let request: { method: string; body: unknown } | null = null;
    server.use(
      http.patch(`${API_URL}/terminals/:id`, async ({ request: req }) => {
        request = { method: req.method, body: await req.json() };
        return HttpResponse.json({ ...terminal, ativo: false });
      }),
    );

    await expect(
      new UpdateTerminalService().exec(terminal.id, { ativo: false }),
    ).resolves.toMatchObject({
      ativo: false,
    });
    expect(request).toEqual({ method: 'PATCH', body: { ativo: false } });
  });

  it('RotateTerminalKeyService: POST /terminals/:id/rotate-key devolve a chave nova', async () => {
    let path = '';
    server.use(
      http.post(`${API_URL}/terminals/:id/rotate-key`, ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json(key);
      }),
    );

    await expect(new RotateTerminalKeyService().exec(terminal.id)).resolves.toEqual(key);
    expect(path).toBe(`/api/v1/terminals/${terminal.id}/rotate-key`);
  });
});
