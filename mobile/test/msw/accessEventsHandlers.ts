import { http, HttpResponse } from 'msw';
import type { MetodoAcesso, ResultadoAcesso } from '@/lib/types/accessEvents';
import type { FakeAccessEventDirectory } from '@/service/fakes/FakeAccessEventDirectory';
import { API_URL } from './handlers';

const filters = (request: Request) => {
  const params = new URL(request.url).searchParams;
  const text = (name: string) => params.get(name) ?? undefined;
  return {
    usuarioId: text('usuarioId'),
    accessPointId: text('accessPointId'),
    terminalId: text('terminalId'),
    metodo: text('metodo') as MetodoAcesso | undefined,
    resultado: text('resultado') as ResultadoAcesso | undefined,
    motivo: text('motivo'),
    de: text('de'),
    ate: text('ate'),
    page: Number(params.get('page') ?? 1),
    pageSize: Number(params.get('pageSize') ?? 20),
  };
};

// Answers /access-events and /me/access-events like the API (B18), from the given directory.
export const accessEventsHandlers = (directory: FakeAccessEventDirectory, me: string) => [
  http.get(`${API_URL}/access-events`, ({ request }) =>
    HttpResponse.json(directory.list(filters(request))),
  ),
  http.get(`${API_URL}/me/access-events`, ({ request }) => {
    const { usuarioId: _ignored, ...params } = filters(request);
    return HttpResponse.json(directory.listMine(me, params));
  }),
];
