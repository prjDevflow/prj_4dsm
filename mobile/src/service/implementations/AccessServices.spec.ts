import { http, HttpResponse } from 'msw';
import { API_URL } from '@test/msw/handlers';
import { server } from '@test/msw/server';
import { ApiError } from '../ApiError';
import { AxiosInstance } from '../AxiosInstance';
import { ValidateQrService } from './AccessServices';

const body = {
  payload: 'ACS1:q3F8k2Zr1pLw9XbTn0YhVA',
  latitude: -23.30512,
  longitude: -45.96551,
  precisaoMetros: 12.5,
};

const granted = {
  resultado: 'AUTORIZADO',
  mensagem: 'Acesso autorizado. Pode passar.',
  local: { nome: 'Catraca Social' },
  usosRestantes: 2,
  distanciaM: 14,
  ocorridoEm: '2026-10-20T14:32:07Z',
};

describe('ValidateQrService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('envia o QR e a posição e devolve o resultado', async () => {
    let received: unknown;
    server.use(
      http.post(`${API_URL}/access/qr/validate`, async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(granted);
      }),
    );

    await expect(new ValidateQrService().exec(body)).resolves.toEqual(granted);
    expect(received).toEqual(body);
  });

  it('sem posição, envia só o QR: quem decide é o servidor', async () => {
    let received: unknown;
    server.use(
      http.post(`${API_URL}/access/qr/validate`, async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(granted);
      }),
    );

    await new ValidateQrService().exec({ payload: body.payload });

    expect(received).toEqual({ payload: body.payload });
  });

  it('uma negação chega com o motivo no código', async () => {
    server.use(
      http.post(`${API_URL}/access/qr/validate`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'DISTANTE_DO_TERMINAL',
              message: 'Você está longe da catraca. Aproxime-se e tente de novo.',
            },
          },
          { status: 403 },
        ),
      ),
    );

    const error = await new ValidateQrService().exec(body).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, code: 'DISTANTE_DO_TERMINAL' });
  });

  it('espera a resposta por 10 s no máximo', async () => {
    const post = jest.spyOn(AxiosInstance, 'post').mockResolvedValueOnce({ data: granted });

    await new ValidateQrService().exec(body);

    expect(post).toHaveBeenCalledWith('/access/qr/validate', body, { timeout: 10_000 });
  });
});
