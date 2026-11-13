import { http, HttpResponse } from 'msw';
import { API_URL } from '@test/msw/handlers';
import { server } from '@test/msw/server';
import { ApiError } from '../ApiError';
import {
  CreateNfcTagService,
  EnableEnrollModeService,
  ListNfcTagsService,
  UpdateNfcTagService,
} from './NfcTagServices';

const tag = {
  id: '9b2f7a10-3c5d-4e8f-a1b2-c3d4e5f60718',
  usuarioId: 'u-1',
  uid: '04A1B2C3',
  descricao: 'Cartão azul',
  ativa: true,
  criadaEm: '2026-11-07T14:32:07.000Z',
};

describe('serviços das tags NFC', () => {
  it('GET /nfc-tags leva a pessoa e a página', async () => {
    let query: Record<string, string> = {};
    server.use(
      http.get(`${API_URL}/nfc-tags`, ({ request }) => {
        query = Object.fromEntries(new URL(request.url).searchParams);
        return HttpResponse.json({ data: [tag], page: 1, pageSize: 20, total: 1 });
      }),
    );

    const page = await new ListNfcTagsService().exec({ usuarioId: 'u-1', page: 1, pageSize: 20 });

    expect(page.data).toEqual([tag]);
    expect(query).toEqual({ usuarioId: 'u-1', page: '1', pageSize: '20' });
  });

  it('POST /nfc-tags envia pessoa, código e descrição', async () => {
    let body: unknown;
    server.use(
      http.post(`${API_URL}/nfc-tags`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(tag, { status: 201 });
      }),
    );

    await expect(
      new CreateNfcTagService().exec({
        usuarioId: 'u-1',
        uid: '04A1B2C3',
        descricao: 'Cartão azul',
      }),
    ).resolves.toEqual(tag);
    expect(body).toEqual({ usuarioId: 'u-1', uid: '04A1B2C3', descricao: 'Cartão azul' });
  });

  it('a tag repetida chega como 409 com o código', async () => {
    server.use(
      http.post(`${API_URL}/nfc-tags`, () =>
        HttpResponse.json(
          { error: { code: 'TAG_JA_CADASTRADA', message: 'Esta tag já está cadastrada' } },
          { status: 409 },
        ),
      ),
    );

    const error = await new CreateNfcTagService()
      .exec({ usuarioId: 'u-1', uid: '04A1B2C3' })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'TAG_JA_CADASTRADA' });
  });

  it('PATCH /nfc-tags/:id envia só "ativa"', async () => {
    let body: unknown;
    server.use(
      http.patch(`${API_URL}/nfc-tags/${tag.id}`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...tag, ativa: false });
      }),
    );

    await expect(new UpdateNfcTagService().exec(tag.id, false)).resolves.toMatchObject({
      ativa: false,
    });
    expect(body).toEqual({ ativa: false });
  });

  it('POST /terminals/:id/enroll-mode liga o modo de cadastro para a pessoa', async () => {
    let body: unknown;
    server.use(
      http.post(`${API_URL}/terminals/t-1/enroll-mode`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          terminalId: 't-1',
          usuarioId: 'u-1',
          expiraEm: '2026-11-07T14:33:07.000Z',
        });
      }),
    );

    await expect(new EnableEnrollModeService().exec('t-1', 'u-1')).resolves.toMatchObject({
      expiraEm: '2026-11-07T14:33:07.000Z',
    });
    expect(body).toEqual({ usuarioId: 'u-1' });
  });
});
