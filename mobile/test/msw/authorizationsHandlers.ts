import { http, HttpResponse, type JsonBodyType } from 'msw';
import type { CreateAuthorizationBody, ListAuthorizationsParams } from '@/lib/types/authorizations';
import { ApiError } from '@/service/ApiError';
import type { FakeAuthorizationDirectory } from '@/service/fakes/FakeAuthorizationDirectory';
import { API_URL } from './handlers';

type Author = { id: string; nome: string };

// Answers /authorizations like the API (B08, B09), keeping the data in the given directory.
const answer = (run: () => JsonBodyType, status = 200) => {
  try {
    return HttpResponse.json(run(), { status });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status === null) throw error;
    const { code, message, details } = error;
    return HttpResponse.json(
      { error: { code, message, ...(details.length ? { details } : {}) } },
      { status: error.status },
    );
  }
};

export const authorizationsHandlers = (directory: FakeAuthorizationDirectory, author: Author) => [
  http.get(`${API_URL}/authorizations`, ({ request }) => {
    const params = new URL(request.url).searchParams;
    const text = (name: string) => params.get(name) ?? undefined;
    return answer(() =>
      directory.list({
        usuarioId: text('usuarioId'),
        accessPointId: text('accessPointId'),
        situacao: text('situacao') as ListAuthorizationsParams['situacao'],
        dataDe: text('dataDe'),
        dataAte: text('dataAte'),
        page: Number(params.get('page') ?? 1),
        pageSize: Number(params.get('pageSize') ?? 20),
      }),
    );
  }),
  http.get(`${API_URL}/me/authorizations`, ({ request }) => {
    const params = new URL(request.url).searchParams;
    return answer(() =>
      directory.listMine(author.id, {
        situacao: (params.get('situacao') ?? undefined) as ListAuthorizationsParams['situacao'],
        page: Number(params.get('page') ?? 1),
        pageSize: Number(params.get('pageSize') ?? 20),
      }),
    );
  }),
  http.get(`${API_URL}/authorizations/:id`, ({ params }) =>
    answer(() => directory.get(String(params.id))),
  ),
  http.post(`${API_URL}/authorizations`, async ({ request }) => {
    const body = (await request.json()) as CreateAuthorizationBody;
    return answer(() => directory.create(body, author), 201);
  }),
  http.patch(`${API_URL}/authorizations/:id/cancel`, async ({ params, request }) => {
    const { motivo } = (await request.json()) as { motivo?: string };
    return answer(() => directory.cancel(String(params.id), motivo, author));
  }),
];
