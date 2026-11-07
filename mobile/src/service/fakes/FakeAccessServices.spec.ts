import { denialReasons } from '@/lib/denialReasons';
import { ApiError } from '../ApiError';
import { FakeValidateQrService } from './FakeAccessServices';

const payload = 'ACS1:q3F8k2Zr1pLw9XbTn0YhVA';
const position = { latitude: -23.30512, longitude: -45.96551, precisaoMetros: 5 };

describe('FakeValidateQrService', () => {
  it('autoriza por padrão, no formato da API', async () => {
    await expect(
      new FakeValidateQrService().exec({ payload, ...position }),
    ).resolves.toMatchObject({
      resultado: 'AUTORIZADO',
      local: { nome: 'Catraca Social' },
      usosRestantes: 2,
    });
  });

  it('como o servidor, nega sem coordenadas', async () => {
    await expect(new FakeValidateQrService().exec({ payload })).rejects.toMatchObject({
      status: 403,
      code: 'LOCALIZACAO_INVALIDA',
    });
  });

  it('nega com o motivo escolhido, com o texto do contrato', async () => {
    const service = new FakeValidateQrService('USOS_ESGOTADOS');

    await expect(service.exec({ payload, ...position })).rejects.toMatchObject({
      status: 403,
      code: 'USOS_ESGOTADOS',
      message: denialReasons.USOS_ESGOTADOS.message,
    });
  });

  it('devolve o erro escolhido e guarda cada chamada', async () => {
    const error = new ApiError(null, 'NETWORK', 'Sem conexão');
    const service = new FakeValidateQrService(error);

    await expect(service.exec({ payload, ...position })).rejects.toBe(error);
    expect(service.calls).toEqual([{ payload, ...position }]);
  });
});
