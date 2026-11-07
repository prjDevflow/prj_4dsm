import { Camera } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Linking } from 'react-native';
import {
  GetCameraAccessService,
  OpenSettingsService,
  RequestCameraAccessService,
  VibrateService,
} from './DeviceServices';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

const getPermission = Camera.getCameraPermissionsAsync as jest.Mock;
const requestPermission = Camera.requestCameraPermissionsAsync as jest.Mock;

describe('serviços da câmera e do aparelho', () => {
  it.each(['granted', 'undetermined', 'denied'])(
    'GetCameraAccessService lê a situação sem pedir nada ao sistema: %s',
    async (status) => {
      getPermission.mockResolvedValueOnce({ status });
      requestPermission.mockClear();

      await expect(new GetCameraAccessService().exec()).resolves.toBe(status);
      expect(requestPermission).not.toHaveBeenCalled();
    },
  );

  it('RequestCameraAccessService pede ao sistema e devolve a resposta', async () => {
    requestPermission.mockResolvedValueOnce({ status: 'denied' });

    await expect(new RequestCameraAccessService().exec()).resolves.toBe('denied');
  });

  it('VibrateService dá uma vibração curta', async () => {
    await new VibrateService().exec();

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  it('VibrateService não atrapalha a leitura se o aparelho não vibrar', async () => {
    (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(new Error('sem vibração'));

    await expect(new VibrateService().exec()).resolves.toBeUndefined();
  });

  it('OpenSettingsService abre as configurações do app', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();

    await new OpenSettingsService().exec();

    expect(openSettings).toHaveBeenCalledTimes(1);
  });
});
