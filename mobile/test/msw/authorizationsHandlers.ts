import { http, HttpResponse } from 'msw';
import type { CreateAuthorizationBody } from '@/lib/types/authorizations';
import { ApiError } from '@/service/ApiError';
import type { FakeCreateAuthorizationService } from '@/service/fakes/FakeAuthorizationServices';
import { API_URL } from './handlers';

// Answers POST /authorizations like the API (B08), with the rules of the fake service.
export const authorizationsHandlers = (service: FakeCreateAuthorizationService) => [
  http.post(`${API_URL}/authorizations`, async ({ request }) => {
    const body = (await request.json()) as CreateAuthorizationBody;
    try {
      return HttpResponse.json(await service.exec(body), { status: 201 });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status === null) throw error;
      const { code, message, details } = error;
      return HttpResponse.json(
        { error: { code, message, ...(details.length ? { details } : {}) } },
        { status: error.status },
      );
    }
  }),
];
