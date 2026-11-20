import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { isSystemQr } from '@/lib/qr';
import { services } from '@/service/container';
import { useValidateAccessModel } from './validateAccess.model';
import { ValidateAccessView } from './validateAccess.view';

const Validation = ({ payload }: { payload: string }) => {
  const router = useRouter();
  const methods = useValidateAccessModel({
    payload,
    getLocationAccessService: services.getLocationAccess,
    requestLocationAccessService: services.requestLocationAccess,
    getPositionService: services.getPosition,
    validateQrService: services.validateQr,
    openSettingsService: services.openSettings,
    resultFeedbackService: services.resultFeedback,
  });
  const goHome = () => router.dismissTo('/');

  return (
    <ValidateAccessView
      {...methods}
      onBack={goHome}
      onDone={goHome}
      onReadAgain={() => router.replace('/access/scanner')}
      onSeeAuthorizations={() => router.replace('/me/authorizations')}
    />
  );
};

export const ValidateAccessPage = () => {
  const { payload } = useLocalSearchParams<{ payload?: string }>();

  // Only the reader opens this route with a QR; a link with anything else goes to the camera.
  if (typeof payload !== 'string' || !isSystemQr(payload)) {
    return <Redirect href="/access/scanner" />;
  }
  return <Validation payload={payload} />;
};
