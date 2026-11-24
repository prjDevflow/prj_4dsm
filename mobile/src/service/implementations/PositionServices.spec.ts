import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import {
  GetLocationAccessService,
  GetPositionService,
  PositionReader,
  PreparePositionService,
  RequestLocationAccessService,
  ResultFeedbackService,
  SimulatePositionService,
} from './PositionServices';

jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

const getPermission = Location.getForegroundPermissionsAsync as jest.Mock;
const requestPermission = Location.requestForegroundPermissionsAsync as jest.Mock;
const getCurrentPosition = Location.getCurrentPositionAsync as jest.Mock;
const notification = Haptics.notificationAsync as jest.Mock;

const fix = (latitude: number, accuracy: number | null = 12.5) => ({
  coords: { latitude, longitude: -45.96551, accuracy },
});

const position = (latitude: number, precisaoMetros = 12.5) => ({
  latitude,
  longitude: -45.96551,
  precisaoMetros,
});

const setup = () => {
  const reader = new PositionReader();
  return {
    prepare: new PreparePositionService(reader),
    get: new GetPositionService(reader),
    simulate: new SimulatePositionService(reader),
  };
};

/** Lets the reading already started get to the GPS. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('permissão de localização', () => {
  beforeEach(() => jest.resetAllMocks());

  it.each(['granted', 'undetermined', 'denied'])(
    'GetLocationAccessService lê a situação sem pedir nada ao sistema: %s',
    async (status) => {
      getPermission.mockResolvedValueOnce({ status });

      await expect(new GetLocationAccessService().exec()).resolves.toBe(status);
      expect(requestPermission).not.toHaveBeenCalled();
    },
  );

  it('RequestLocationAccessService pede ao sistema e devolve a resposta', async () => {
    requestPermission.mockResolvedValueOnce({ status: 'denied' });

    await expect(new RequestLocationAccessService().exec()).resolves.toBe('denied');
  });
});

describe('posição da validação', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getPermission.mockResolvedValue({ status: 'granted' });
  });

  afterEach(() => jest.useRealTimers());

  it('lê com alta precisão e devolve a precisão em metros', async () => {
    getCurrentPosition.mockResolvedValueOnce(fix(-23.3));

    await expect(setup().get.exec()).resolves.toEqual(position(-23.3));
    expect(getCurrentPosition).toHaveBeenCalledWith({ accuracy: Location.Accuracy.High });
  });

  it('sem a precisão informada pelo aparelho, envia só as coordenadas', async () => {
    getCurrentPosition.mockResolvedValueOnce(fix(-23.3, null));

    await expect(setup().get.exec()).resolves.toEqual({ latitude: -23.3, longitude: -45.96551 });
  });

  it('se o GPS falhar, não há posição', async () => {
    getCurrentPosition.mockRejectedValueOnce(new Error('GPS desligado'));

    await expect(setup().get.exec()).resolves.toBeNull();
  });

  it('desiste depois de 8 s', async () => {
    jest.useFakeTimers();
    getCurrentPosition.mockReturnValueOnce(new Promise(() => {}));

    const reading = setup().get.exec();
    let settled = false;
    void reading.then(() => {
      settled = true;
    });

    await jest.advanceTimersByTimeAsync(7_999);
    expect(settled).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    await expect(reading).resolves.toBeNull();
  });

  it('prepara a posição antes do QR e diz que ficou pronta', async () => {
    getCurrentPosition.mockResolvedValueOnce(fix(-23.3));

    await expect(setup().prepare.exec()).resolves.toBe(true);
  });

  it('sem a permissão, não prepara nem pergunta nada', async () => {
    getPermission.mockResolvedValueOnce({ status: 'undetermined' });

    await expect(setup().prepare.exec()).resolves.toBe(false);
    expect(requestPermission).not.toHaveBeenCalled();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('se não der para preparar, avisa sem quebrar', async () => {
    getPermission.mockRejectedValueOnce(new Error('sem serviço'));

    await expect(setup().prepare.exec()).resolves.toBe(false);
  });

  it('a validação usa a posição preparada, sem ler de novo', async () => {
    getCurrentPosition.mockResolvedValueOnce(fix(-23.3));
    const { prepare, get } = setup();
    await prepare.exec();

    await expect(get.exec()).resolves.toEqual(position(-23.3));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('com a leitura ainda em andamento, a validação espera por ela', async () => {
    let finish: (value: unknown) => void = () => {};
    getCurrentPosition.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const { prepare, get } = setup();

    const preparing = prepare.exec();
    await settle();
    const reading = get.exec();
    finish(fix(-23.3));

    await expect(reading).resolves.toEqual(position(-23.3));
    await preparing;
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('a posição preparada vale uma validação: "Tentar de novo" lê outra vez', async () => {
    getCurrentPosition.mockResolvedValueOnce(fix(-23.3)).mockResolvedValueOnce(fix(-23.4));
    const { prepare, get } = setup();
    await prepare.exec();

    await get.exec();

    await expect(get.exec()).resolves.toEqual(position(-23.4));
  });

  it('uma posição preparada há mais de 30 s não é usada', async () => {
    jest.useFakeTimers();
    getCurrentPosition.mockResolvedValueOnce(fix(-23.3)).mockResolvedValueOnce(fix(-23.4));
    const { prepare, get } = setup();
    await prepare.exec();

    await jest.advanceTimersByTimeAsync(30_001);

    await expect(get.exec()).resolves.toEqual(position(-23.4));
  });

  it('preparar de novo descarta a posição anterior', async () => {
    let finish: (value: unknown) => void = () => {};
    getCurrentPosition
      .mockResolvedValueOnce(fix(-23.3))
      .mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const { prepare, get } = setup();
    await prepare.exec();

    const preparing = prepare.exec();
    await settle();
    const reading = get.exec();
    finish(fix(-23.4));

    await expect(reading).resolves.toEqual(position(-23.4));
    await preparing;
  });
});

describe('simular posição (só no ensaio)', () => {
  beforeEach(() => jest.resetAllMocks());

  it('começa na posição real', () => {
    expect(setup().simulate.current()).toBe('real');
  });

  it('"catraca" responde a posição do seed, sem usar o GPS', async () => {
    const { simulate, get, prepare } = setup();

    simulate.exec('catraca');

    expect(simulate.current()).toBe('catraca');
    await expect(prepare.exec()).resolves.toBe(true);
    await expect(get.exec()).resolves.toEqual({
      latitude: -23.30512,
      longitude: -45.96551,
      precisaoMetros: 5,
    });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('"longe" fica a mais de 100 m da catraca', async () => {
    const { simulate, get } = setup();

    simulate.exec('longe');
    const away = await get.exec();

    // 1 degree of latitude is about 111 km.
    expect(Math.abs((away?.latitude ?? 0) - -23.30512) * 111_000).toBeGreaterThan(150);
  });

  it('voltar para "real" usa o GPS de novo', async () => {
    getPermission.mockResolvedValue({ status: 'granted' });
    getCurrentPosition.mockResolvedValueOnce(fix(-23.3));
    const { simulate, get } = setup();

    simulate.exec('catraca');
    simulate.exec('real');

    await expect(get.exec()).resolves.toEqual(position(-23.3));
  });
});

describe('ResultFeedbackService', () => {
  beforeEach(() => jest.resetAllMocks());

  it('vibra de sucesso no autorizado', async () => {
    await new ResultFeedbackService().exec('sucesso');

    expect(notification).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });

  it('vibra de erro no negado', async () => {
    await new ResultFeedbackService().exec('erro');

    expect(notification).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
  });

  it('um aparelho sem vibração não quebra o resultado', async () => {
    notification.mockRejectedValueOnce(new Error('sem vibração'));

    await expect(new ResultFeedbackService().exec('erro')).resolves.toBeUndefined();
  });
});
