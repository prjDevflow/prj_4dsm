import { http, HttpResponse, type JsonBodyType } from 'msw';
import type {
  CreateAccessPointBody,
  CreateBuildingBody,
  CreateTerminalBody,
  UpdateAccessPointBody,
  UpdateBuildingBody,
  UpdateTerminalBody,
} from '@/lib/types/locations';
import { ApiError } from '@/service/ApiError';
import type { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import { API_URL } from './handlers';

// Answers /buildings, /access-points and /terminals like the API (B07), keeping the data in the
// given directory.
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

const pageOf = (request: Request) => {
  const params = new URL(request.url).searchParams;
  return { page: Number(params.get('page') ?? 1), pageSize: Number(params.get('pageSize') ?? 20) };
};

export const locationsHandlers = (directory: FakeLocationDirectory) => [
  http.get(`${API_URL}/buildings`, ({ request }) =>
    answer(() => directory.listBuildings(pageOf(request))),
  ),
  http.post(`${API_URL}/buildings`, async ({ request }) => {
    const body = (await request.json()) as CreateBuildingBody;
    return answer(() => directory.createBuilding(body), 201);
  }),
  http.patch(`${API_URL}/buildings/:id`, async ({ params, request }) => {
    const body = (await request.json()) as UpdateBuildingBody;
    return answer(() => directory.updateBuilding(String(params.id), body));
  }),
  http.get(`${API_URL}/access-points`, ({ request }) =>
    answer(() => directory.listAccessPoints(pageOf(request))),
  ),
  http.post(`${API_URL}/access-points`, async ({ request }) => {
    const body = (await request.json()) as CreateAccessPointBody;
    return answer(() => directory.createAccessPoint(body), 201);
  }),
  http.patch(`${API_URL}/access-points/:id`, async ({ params, request }) => {
    const body = (await request.json()) as UpdateAccessPointBody;
    return answer(() => directory.updateAccessPoint(String(params.id), body));
  }),
  http.get(`${API_URL}/terminals`, ({ request }) =>
    answer(() => directory.listTerminals(pageOf(request))),
  ),
  http.get(`${API_URL}/terminals/:id`, ({ params }) =>
    answer(() => directory.getTerminal(String(params.id))),
  ),
  http.post(`${API_URL}/terminals`, async ({ request }) => {
    const body = (await request.json()) as CreateTerminalBody;
    return answer(() => directory.createTerminal(body), 201);
  }),
  http.patch(`${API_URL}/terminals/:id`, async ({ params, request }) => {
    const body = (await request.json()) as UpdateTerminalBody;
    return answer(() => directory.updateTerminal(String(params.id), body));
  }),
  http.post(`${API_URL}/terminals/:id/rotate-key`, ({ params }) =>
    answer(() => directory.rotateKey(String(params.id))),
  ),
];
