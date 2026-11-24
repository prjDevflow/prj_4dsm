import { useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useScannerModel } from './scanner.model';
import { ScannerView } from './scanner.view';

export const ScannerPage = () => {
  const router = useRouter();
  const methods = useScannerModel({
    getCameraAccessService: services.getCameraAccess,
    requestCameraAccessService: services.requestCameraAccess,
    vibrateService: services.vibrate,
    openSettingsService: services.openSettings,
    preparePositionService: services.preparePosition,
    simulatePositionService: services.simulatePosition,
    // `replace`: "back" must not return to a camera that already stopped reading.
    onValidQr: (payload) => router.replace({ pathname: '/access/validate', params: { payload } }),
  });

  return (
    <ScannerView
      {...methods}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      devPaste={__DEV__}
    />
  );
};
