import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import type { PermissionAccess } from '@/service/IDeviceService';
import {
  FakeGetCameraAccessService,
  FakeOpenSettingsService,
  FakeRequestCameraAccessService,
  FakeVibrateService,
} from '@/service/fakes/FakeDeviceServices';
import {
  FakePreparePositionService,
  FakeSimulatePositionService,
} from '@/service/fakes/FakePositionServices';
import { useScannerModel } from './scanner.model';

const VALID_QR = 'ACS1:q3F8k2Zr1pLw9XbTn0YhVA';
const OTHER_QR = 'https://exemplo.com.br';

const setup = async (
  access: PermissionAccess = 'granted',
  answer: PermissionAccess = 'granted',
  preparePositionService = new FakePreparePositionService(),
  simulatePositionService = new FakeSimulatePositionService(),
) => {
  const services = {
    getCameraAccessService: new FakeGetCameraAccessService(access),
    requestCameraAccessService: new FakeRequestCameraAccessService(answer),
    vibrateService: new FakeVibrateService(),
    openSettingsService: new FakeOpenSettingsService(),
    preparePositionService,
    simulatePositionService,
  };
  const onValidQr = jest.fn();
  const hook = await renderHook(() => useScannerModel({ ...services, onValidQr }));
  await waitFor(() => expect(hook.result.current.status).not.toBe('checking'));
  return { ...services, onValidQr, ...hook };
};

describe('useScannerModel: permissão', () => {
  afterEach(() => jest.restoreAllMocks());

  it('com a permissão já concedida, vai direto para a câmera', async () => {
    const { result, requestCameraAccessService } = await setup('granted');

    expect(result.current.status).toBe('ready');
    expect(requestCameraAccessService.calls).toBe(0);
  });

  it('sem ter pedido ainda, explica antes de mostrar a pergunta do sistema', async () => {
    const { result, requestCameraAccessService } = await setup('undetermined');

    expect(result.current.status).toBe('ask');
    expect(requestCameraAccessService.calls).toBe(0);
  });

  it('"Permitir câmera" faz a pergunta do sistema e, aceita, abre a câmera', async () => {
    const { result, requestCameraAccessService } = await setup('undetermined', 'granted');

    await act(() => result.current.onAllow());

    expect(requestCameraAccessService.calls).toBe(1);
    expect(result.current.status).toBe('ready');
  });

  it('recusar na pergunta do sistema leva à explicação', async () => {
    const { result } = await setup('undetermined', 'denied');

    await act(() => result.current.onAllow());

    expect(result.current.status).toBe('denied');
  });

  it('com a permissão negada antes, mostra a explicação sem perguntar de novo', async () => {
    const { result, requestCameraAccessService } = await setup('denied');

    expect(result.current.status).toBe('denied');
    expect(requestCameraAccessService.calls).toBe(0);
  });

  it('"Abrir configurações" abre as configurações do aparelho', async () => {
    const { result, openSettingsService } = await setup('denied');

    await act(() => result.current.onOpenSettings());

    expect(openSettingsService.calls).toBe(1);
  });

  const watchAppState = () => {
    let onChange: (state: AppStateStatus) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      onChange = listener;
      return { remove: jest.fn() } as never;
    });
    return { backToApp: () => act(async () => onChange('active')) };
  };

  it('voltar das configurações pede de novo: o Expo Go guarda o "não" e só a pergunta o libera', async () => {
    const { backToApp } = watchAppState();
    const { result, requestCameraAccessService } = await setup('denied', 'granted');

    await act(() => result.current.onOpenSettings());
    await backToApp();

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(requestCameraAccessService.calls).toBe(1);
  });

  it('voltar das configurações sem liberar continua na explicação', async () => {
    const { backToApp } = watchAppState();
    const { result } = await setup('denied', 'denied');

    await act(() => result.current.onOpenSettings());
    await backToApp();

    expect(result.current.status).toBe('denied');
  });

  it('a pergunta do sistema ao fechar não pergunta de novo: isso viraria um laço', async () => {
    const { backToApp } = watchAppState();
    const { result, getCameraAccessService, requestCameraAccessService } = await setup(
      'undetermined',
      'denied',
    );

    await act(() => result.current.onAllow());
    getCameraAccessService.access = 'denied';
    await backToApp();
    await backToApp();

    expect(requestCameraAccessService.calls).toBe(1);
    expect(result.current.status).toBe('denied');
  });

  it('voltar ao app por conta própria só confere a permissão, sem perguntar', async () => {
    const { backToApp } = watchAppState();
    const { result, getCameraAccessService, requestCameraAccessService } = await setup('denied');

    getCameraAccessService.access = 'granted';
    await backToApp();

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(requestCameraAccessService.calls).toBe(0);
  });

  it('só a primeira volta depois das configurações pergunta', async () => {
    const { backToApp } = watchAppState();
    const { result, requestCameraAccessService } = await setup('denied', 'denied');

    await act(() => result.current.onOpenSettings());
    await backToApp();
    await backToApp();

    expect(requestCameraAccessService.calls).toBe(1);
  });

  it('se não der para ler a permissão, trata como câmera indisponível, sem travar', async () => {
    const { getCameraAccessService, ...rest } = await setup('granted');
    getCameraAccessService.exec = () => Promise.reject(new Error('sem câmera'));

    const { result } = await renderHook(() =>
      useScannerModel({ ...rest, getCameraAccessService, onValidQr: jest.fn() }),
    );

    await waitFor(() => expect(result.current.status).toBe('unavailable'));
  });

  it('se a câmera não abrir, mostra que está indisponível', async () => {
    const { result } = await setup('granted');

    await act(async () => result.current.onCameraError());

    expect(result.current.status).toBe('unavailable');
  });
});

describe('useScannerModel: posição pronta antes do QR', () => {
  it('com a câmera aberta, já começa a pegar a posição', async () => {
    const { result, preparePositionService } = await setup('granted');

    await waitFor(() => expect(result.current.positionReady).toBe(true));
    expect(preparePositionService.calls).toBe(1);
  });

  it('sem a câmera, não liga o GPS', async () => {
    const { result, preparePositionService } = await setup('denied');

    await act(async () => {});
    expect(preparePositionService.calls).toBe(0);
    expect(result.current.positionReady).toBe(false);
  });

  it('se a posição não vier, o leitor segue normalmente', async () => {
    const preparePositionService = new FakePreparePositionService(false);
    const { result } = await setup('granted', 'granted', preparePositionService);

    await waitFor(() => expect(preparePositionService.calls).toBe(1));
    expect(result.current.positionReady).toBe(false);
    expect(result.current.status).toBe('ready');
  });

  it('a permissão concedida na hora também prepara a posição', async () => {
    const { result, preparePositionService } = await setup('undetermined', 'granted');

    await act(() => result.current.onAllow());

    await waitFor(() => expect(preparePositionService.calls).toBe(1));
  });

  it('começa com a posição simulada que já estava escolhida', async () => {
    const simulatePositionService = new FakeSimulatePositionService();
    simulatePositionService.exec('longe');

    const { result } = await setup('granted', 'granted', undefined, simulatePositionService);

    expect(result.current.simulatedPosition).toBe('longe');
  });

  it('trocar a posição simulada prepara de novo', async () => {
    const { result, preparePositionService, simulatePositionService } = await setup();
    await waitFor(() => expect(preparePositionService.calls).toBe(1));

    await act(async () => result.current.onSimulatePosition('catraca'));

    expect(simulatePositionService.current()).toBe('catraca');
    expect(result.current.simulatedPosition).toBe('catraca');
    await waitFor(() => expect(preparePositionService.calls).toBe(2));
  });
});

describe('useScannerModel: leitura', () => {
  afterEach(() => jest.useRealTimers());

  it('um QR de outro tipo mostra o aviso e não abre a validação', async () => {
    const { result, onValidQr, vibrateService } = await setup();

    await act(async () => result.current.onRead(OTHER_QR));

    expect(result.current.noticeVisible).toBe(true);
    expect(onValidQr).not.toHaveBeenCalled();
    expect(vibrateService.calls).toBe(0);
  });

  it('o aviso some em 3 s', async () => {
    const { result } = await setup();
    jest.useFakeTimers();

    await act(async () => result.current.onRead(OTHER_QR));
    await act(async () => jest.advanceTimersByTime(2_999));
    expect(result.current.noticeVisible).toBe(true);

    await act(async () => jest.advanceTimersByTime(1));
    expect(result.current.noticeVisible).toBe(false);
  });

  it('depois de um QR de outro tipo, a leitura continua', async () => {
    const { result, onValidQr } = await setup();

    await act(async () => result.current.onRead(OTHER_QR));
    await act(async () => result.current.onRead(VALID_QR));

    expect(onValidQr).toHaveBeenCalledWith(VALID_QR);
    expect(result.current.noticeVisible).toBe(false);
  });

  it('um QR válido vibra e entrega o texto lido', async () => {
    const { result, onValidQr, vibrateService } = await setup();

    await act(async () => result.current.onRead(VALID_QR));

    expect(vibrateService.calls).toBe(1);
    expect(onValidQr).toHaveBeenCalledWith(VALID_QR);
  });

  it('três leituras seguidas da mesma imagem abrem a validação uma vez só', async () => {
    const { result, onValidQr, vibrateService } = await setup();

    await act(async () => {
      result.current.onRead(VALID_QR);
      result.current.onRead(VALID_QR);
      result.current.onRead(VALID_QR);
    });

    expect(onValidQr).toHaveBeenCalledTimes(1);
    expect(vibrateService.calls).toBe(1);
  });

  it('depois de um QR válido, a leitura fica congelada até para outros QRs', async () => {
    const { result, onValidQr } = await setup();

    await act(async () => result.current.onRead(VALID_QR));
    await act(async () => result.current.onRead(OTHER_QR));

    expect(onValidQr).toHaveBeenCalledTimes(1);
    expect(result.current.noticeVisible).toBe(false);
  });

  it('a lanterna começa desligada e alterna', async () => {
    const { result } = await setup();
    expect(result.current.torchOn).toBe(false);

    await act(async () => result.current.onToggleTorch());
    expect(result.current.torchOn).toBe(true);

    await act(async () => result.current.onToggleTorch());
    expect(result.current.torchOn).toBe(false);
  });
});
