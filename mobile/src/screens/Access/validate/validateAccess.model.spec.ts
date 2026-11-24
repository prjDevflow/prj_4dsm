import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { denialReasons, type DenialReason } from '@/lib/denialReasons';
import { ApiError } from '@/service/ApiError';
import type { PermissionAccess, PhonePosition } from '@/service/IDeviceService';
import { FakeValidateQrService } from '@/service/fakes/FakeAccessServices';
import { FakeOpenSettingsService } from '@/service/fakes/FakeDeviceServices';
import {
  FakeGetLocationAccessService,
  FakeGetPositionService,
  FakeRequestLocationAccessService,
  FakeResultFeedbackService,
  samplePosition,
} from '@/service/fakes/FakePositionServices';
import { useValidateAccessModel } from './validateAccess.model';

const payload = 'ACS1:q3F8k2Zr1pLw9XbTn0YhVA';

type SetupOptions = {
  access?: PermissionAccess;
  answer?: PermissionAccess;
  position?: PhonePosition | null;
  getPositionService?: FakeGetPositionService;
  validateQrService?: FakeValidateQrService;
};

const setup = async ({
  access = 'granted',
  answer = 'granted',
  position = samplePosition,
  getPositionService = new FakeGetPositionService(position),
  validateQrService = new FakeValidateQrService(),
}: SetupOptions = {}) => {
  const services = {
    getLocationAccessService: new FakeGetLocationAccessService(access),
    requestLocationAccessService: new FakeRequestLocationAccessService(answer),
    getPositionService,
    openSettingsService: new FakeOpenSettingsService(),
    resultFeedbackService: new FakeResultFeedbackService(),
    validateQrService,
  };
  const hook = await renderHook(() => useValidateAccessModel({ ...services, payload }));
  return { ...services, ...hook };
};

/** Runs until a result is on the screen. */
const finished = async (options: SetupOptions = {}) => {
  const screen = await setup(options);
  await waitFor(() => expect(screen.result.current.stage).toBe('result'));
  return screen;
};

const reasons = Object.keys(denialReasons) as DenialReason[];

describe('useValidateAccessModel: resultado', () => {
  it('envia o QR, as coordenadas e a precisão, e devolve o autorizado', async () => {
    const validateQrService = new FakeValidateQrService();

    const { result } = await finished({ validateQrService });

    expect(validateQrService.calls).toEqual([{ payload, ...samplePosition }]);
    expect(result.current.result).toEqual({
      tipo: 'AUTORIZADO',
      local: 'Catraca Social',
      usosRestantes: 2,
      ocorridoEm: '2026-10-20T14:32:07Z',
    });
  });

  it.each(reasons)('%s vira uma negação com o motivo, não um erro de tela', async (motivo) => {
    const { result } = await finished({ validateQrService: new FakeValidateQrService(motivo) });

    expect(result.current.result).toEqual({ tipo: 'NEGADO', motivo });
  });

  it.each([
    ['sem rede', new ApiError(null, 'NETWORK', 'Sem conexão')],
    ['tempo esgotado', new ApiError(null, 'TIMEOUT', 'Tempo esgotado')],
  ])('%s vira SEM_CONEXAO', async (_, error) => {
    const validateQrService = new FakeValidateQrService(error);

    const { result } = await finished({ validateQrService });

    expect(result.current.result).toEqual({ tipo: 'SEM_CONEXAO' });
    expect(validateQrService.calls).toHaveLength(1);
  });

  it.each([
    ['500', new ApiError(500, 'INTERNAL_ERROR', '')],
    ['503', new ApiError(503, 'INTERNAL_ERROR', '')],
    ['429 do limite por minuto', new ApiError(429, 'RATE_LIMITED', 'Muitas tentativas')],
    ['422 inesperado', new ApiError(422, 'VALIDATION_ERROR', 'Inválido')],
    ['403 de perfil sem permissão', new ApiError(403, 'FORBIDDEN', 'Sem permissão')],
    ['403 com um código novo', new ApiError(403, 'MOTIVO_NOVO', 'Texto novo')],
  ])('%s vira ERRO_SERVIDOR, sem repetir sozinho', async (_, error) => {
    const validateQrService = new FakeValidateQrService(error);

    const { result } = await finished({ validateQrService });

    expect(result.current.result).toEqual({ tipo: 'ERRO_SERVIDOR' });
    expect(validateQrService.calls).toHaveLength(1);
  });

  it('um erro que não veio da API também não trava a tela', async () => {
    const validateQrService = new FakeValidateQrService();
    validateQrService.exec = () => Promise.reject(new Error('quebrou'));

    const { result } = await finished({ validateQrService });

    expect(result.current.result).toEqual({ tipo: 'ERRO_SERVIDOR' });
  });

  it('401 deixa o fluxo de sessão expirada agir: sem resultado e sem vibrar', async () => {
    const validateQrService = new FakeValidateQrService(new ApiError(401, 'UNAUTHORIZED', ''));

    const { result, resultFeedbackService } = await setup({ validateQrService });

    await waitFor(() => expect(validateQrService.calls).toHaveLength(1));
    await act(async () => {});
    expect(result.current.result).toBeNull();
    expect(result.current.stage).toBe('validating');
    expect(resultFeedbackService.calls).toEqual([]);
  });

  it('vibra de sucesso no autorizado', async () => {
    const { resultFeedbackService } = await finished();

    expect(resultFeedbackService.calls).toEqual(['sucesso']);
  });

  it('vibra de erro na negação', async () => {
    const { resultFeedbackService } = await finished({
      validateQrService: new FakeValidateQrService('USOS_ESGOTADOS'),
    });

    expect(resultFeedbackService.calls).toEqual(['erro']);
  });

  it('vibra de erro sem conexão', async () => {
    const { resultFeedbackService } = await finished({
      validateQrService: new FakeValidateQrService(new ApiError(null, 'NETWORK', 'Sem conexão')),
    });

    expect(resultFeedbackService.calls).toEqual(['erro']);
  });
});

describe('useValidateAccessModel: posição', () => {
  it('com a permissão, pega a posição sem perguntar nada', async () => {
    const { requestLocationAccessService, getPositionService } = await finished();

    expect(requestLocationAccessService.calls).toBe(0);
    expect(getPositionService.calls).toBe(1);
  });

  it('sem posição em 8 s, envia sem coordenadas e mostra o que o servidor devolver', async () => {
    const validateQrService = new FakeValidateQrService();

    const { result } = await finished({ position: null, validateQrService });

    expect(validateQrService.calls).toEqual([{ payload }]);
    expect(result.current.result).toEqual({ tipo: 'NEGADO', motivo: 'LOCALIZACAO_INVALIDA' });
  });

  it('diz "Localização confirmada" só quando há uma posição', async () => {
    const validateQrService = new FakeValidateQrService();
    validateQrService.exec = () => new Promise(() => {});

    const { result } = await setup({ validateQrService });
    await waitFor(() => expect(result.current.stage).toBe('validating'));

    expect(result.current.located).toBe(true);
  });

  it('sem posição, não diz que a localização foi confirmada', async () => {
    const validateQrService = new FakeValidateQrService();
    validateQrService.exec = () => new Promise(() => {});

    const { result } = await setup({ position: null, validateQrService });
    await waitFor(() => expect(result.current.stage).toBe('validating'));

    expect(result.current.located).toBe(false);
  });

  it('mostra que está localizando enquanto espera o GPS', async () => {
    const getPositionService = new FakeGetPositionService();
    getPositionService.exec = () => new Promise(() => {});

    const { result, validateQrService } = await setup({ getPositionService });

    await waitFor(() => expect(result.current.stage).toBe('locating'));
    expect(validateQrService.calls).toEqual([]);
  });
});

describe('useValidateAccessModel: permissão de localização', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sem ter pedido ainda, explica antes da pergunta do sistema e não valida', async () => {
    const { result, validateQrService, getPositionService, requestLocationAccessService } =
      await setup({ access: 'undetermined' });

    await waitFor(() => expect(result.current.stage).toBe('ask'));
    expect(requestLocationAccessService.calls).toBe(0);
    expect(getPositionService.calls).toBe(0);
    expect(validateQrService.calls).toEqual([]);
  });

  it('"Permitir localização" faz a pergunta do sistema e, aceita, segue para a validação', async () => {
    const { result, validateQrService, requestLocationAccessService } = await setup({
      access: 'undetermined',
      answer: 'granted',
    });
    await waitFor(() => expect(result.current.stage).toBe('ask'));

    await act(() => result.current.onAllow());

    await waitFor(() => expect(result.current.stage).toBe('result'));
    expect(requestLocationAccessService.calls).toBe(1);
    expect(validateQrService.calls).toHaveLength(1);
  });

  it('recusar na pergunta do sistema leva à explicação e não valida', async () => {
    const { result, validateQrService } = await setup({ access: 'undetermined', answer: 'denied' });
    await waitFor(() => expect(result.current.stage).toBe('ask'));

    await act(() => result.current.onAllow());

    expect(result.current.stage).toBe('denied');
    expect(validateQrService.calls).toEqual([]);
  });

  it('com a permissão negada antes, explica e não valida', async () => {
    const { result, validateQrService, requestLocationAccessService } = await setup({
      access: 'denied',
    });

    await waitFor(() => expect(result.current.stage).toBe('denied'));
    expect(requestLocationAccessService.calls).toBe(0);
    expect(validateQrService.calls).toEqual([]);
  });

  it('"Abrir configurações" abre as configurações do aparelho', async () => {
    const { result, openSettingsService } = await setup({ access: 'denied' });
    await waitFor(() => expect(result.current.stage).toBe('denied'));

    await act(() => result.current.onOpenSettings());

    expect(openSettingsService.calls).toBe(1);
  });

  it('voltar das configurações com a permissão liberada segue para a validação', async () => {
    let onChange: (state: AppStateStatus) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      onChange = listener;
      return { remove: jest.fn() } as never;
    });
    const { result, validateQrService } = await setup({ access: 'denied', answer: 'granted' });
    await waitFor(() => expect(result.current.stage).toBe('denied'));

    await act(() => result.current.onOpenSettings());
    await act(async () => onChange('active'));

    await waitFor(() => expect(result.current.stage).toBe('result'));
    expect(validateQrService.calls).toHaveLength(1);
  });

  it('se não der para ler a permissão, envia sem coordenadas em vez de travar', async () => {
    const validateQrService = new FakeValidateQrService();
    const services = {
      getLocationAccessService: new FakeGetLocationAccessService(),
      requestLocationAccessService: new FakeRequestLocationAccessService(),
      getPositionService: new FakeGetPositionService(null),
      openSettingsService: new FakeOpenSettingsService(),
      resultFeedbackService: new FakeResultFeedbackService(),
      validateQrService,
    };
    services.getLocationAccessService.exec = () => Promise.reject(new Error('sem serviço'));

    const { result } = await renderHook(() => useValidateAccessModel({ ...services, payload }));

    await waitFor(() => expect(result.current.stage).toBe('result'));
    expect(validateQrService.calls).toEqual([{ payload }]);
  });
});

describe('useValidateAccessModel: uma validação só', () => {
  afterEach(() => jest.restoreAllMocks());

  it('voltar ao app durante a validação não envia de novo', async () => {
    let onChange: (state: AppStateStatus) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      onChange = listener;
      return { remove: jest.fn() } as never;
    });
    const validateQrService = new FakeValidateQrService();
    const calls = jest.fn();
    validateQrService.exec = () => {
      calls();
      return new Promise(() => {});
    };

    const { result } = await setup({ validateQrService });
    await waitFor(() => expect(result.current.stage).toBe('validating'));

    await act(async () => onChange('active'));
    await act(async () => onChange('active'));

    expect(calls).toHaveBeenCalledTimes(1);
  });

  it('desenhar a tela de novo não envia de novo', async () => {
    const validateQrService = new FakeValidateQrService();

    const { rerender } = await finished({ validateQrService });
    await rerender({});

    expect(validateQrService.calls).toHaveLength(1);
  });

  it('dois toques em "Permitir localização" valem uma validação', async () => {
    const { result, validateQrService } = await setup({ access: 'undetermined' });
    await waitFor(() => expect(result.current.stage).toBe('ask'));

    await act(async () => {
      void result.current.onAllow();
      void result.current.onAllow();
    });

    await waitFor(() => expect(result.current.stage).toBe('result'));
    expect(validateQrService.calls).toHaveLength(1);
  });
});
