import { http, HttpResponse } from 'msw';
import type { Perfil } from '@/lib/types/auth';
import type { CreateUserBody, UpdateUserBody } from '@/lib/types/users';
import { ApiError } from '@/service/ApiError';
import type { FakeUserDirectory } from '@/service/fakes/FakeUserDirectory';
import { API_URL } from './handlers';

// Answers /users like the API (B06), keeping the users in the given directory.
const answer = (run: () => unknown, status = 200) => {
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

export const usersHandlers = (directory: FakeUserDirectory, actorId: string) => [
  http.get(`${API_URL}/users`, ({ request }) => {
    const params = new URL(request.url).searchParams;
    const ativo = params.get('ativo');
    return answer(() =>
      directory.list({
        perfil: (params.get('perfil') as Perfil | null) ?? undefined,
        ativo: ativo === null ? undefined : ativo === 'true',
        q: params.get('q') ?? undefined,
        page: Number(params.get('page') ?? 1),
        pageSize: Number(params.get('pageSize') ?? 20),
      }),
    );
  }),
  http.get(`${API_URL}/users/:id`, ({ params }) => answer(() => directory.get(String(params.id)))),
  http.post(`${API_URL}/users`, async ({ request }) => {
    const body = (await request.json()) as CreateUserBody;
    return answer(() => directory.create(body), 201);
  }),
  http.patch(`${API_URL}/users/:id`, async ({ params, request }) => {
    const body = (await request.json()) as UpdateUserBody;
    return answer(() => directory.update(String(params.id), body, actorId));
  }),
];
