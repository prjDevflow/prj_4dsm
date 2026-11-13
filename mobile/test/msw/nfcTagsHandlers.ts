import { http, HttpResponse } from 'msw';
import type { FakeNfcTagDirectory } from '@/service/fakes/FakeNfcTagDirectory';
import { API_URL } from './handlers';

// Answers GET /nfc-tags like the API (B16), from the given directory.
export const nfcTagsHandlers = (directory: FakeNfcTagDirectory) => [
  http.get(`${API_URL}/nfc-tags`, ({ request }) => {
    const params = new URL(request.url).searchParams;
    return HttpResponse.json(
      directory.list({
        usuarioId: params.get('usuarioId') ?? undefined,
        page: Number(params.get('page') ?? 1),
        pageSize: Number(params.get('pageSize') ?? 20),
      }),
    );
  }),
];
