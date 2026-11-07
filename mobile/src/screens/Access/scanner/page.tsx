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
    // The validation (F11) receives the text here. `replace`: "back" must not return to a camera
    // that already stopped reading.
    onValidQr: () => router.replace('/em-breve/validacao'),
  });

  return (
    <ScannerView
      {...methods}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      devPaste={__DEV__}
    />
  );
};
