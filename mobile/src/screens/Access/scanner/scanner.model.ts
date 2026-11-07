import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { isSystemQr } from '@/lib/qr';
import type {
  CameraAccess,
  IGetCameraAccessService,
  IOpenSettingsService,
  IRequestCameraAccessService,
  IVibrateService,
} from '@/service/IDeviceService';

export type ScannerStatus = 'checking' | 'ask' | 'denied' | 'ready' | 'unavailable';

const NOTICE_MS = 3_000;

const accessStatus: Record<CameraAccess, ScannerStatus> = {
  granted: 'ready',
  undetermined: 'ask',
  denied: 'denied',
};

type ScannerModelProps = {
  getCameraAccessService: IGetCameraAccessService;
  requestCameraAccessService: IRequestCameraAccessService;
  vibrateService: IVibrateService;
  openSettingsService: IOpenSettingsService;
  /** Called once, with the text of the first QR of the system. */
  onValidQr: (payload: string) => void;
};

// T06 and T07: the camera reads the same image many times per second, so one `ref` stops it all.
export const useScannerModel = ({
  getCameraAccessService,
  requestCameraAccessService,
  vibrateService,
  openSettingsService,
  onValidQr,
}: ScannerModelProps) => {
  const [status, setStatus] = useState<ScannerStatus>('checking');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const alreadyRead = useRef(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const loadAccess = async () => {
      try {
        setStatus(accessStatus[await getCameraAccessService.exec()]);
      } catch {
        setStatus('unavailable');
      }
    };

    void loadAccess();
    // Coming back from the system settings: the person may have just allowed the camera.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void loadAccess();
    });

    return () => {
      subscription.remove();
      clearTimeout(noticeTimer.current);
    };
  }, [getCameraAccessService]);

  const onRead = (text: string) => {
    if (alreadyRead.current) return;

    clearTimeout(noticeTimer.current);
    if (!isSystemQr(text)) {
      // While the wrong QR stays in front of the camera the message stays too, then goes in 3 s.
      setNoticeVisible(true);
      noticeTimer.current = setTimeout(() => setNoticeVisible(false), NOTICE_MS);
      return;
    }

    alreadyRead.current = true;
    setNoticeVisible(false);
    void vibrateService.exec();
    onValidQr(text);
  };

  return {
    status,
    noticeVisible,
    torchOn,
    onAllow: async () => setStatus(accessStatus[await requestCameraAccessService.exec()]),
    onOpenSettings: () => openSettingsService.exec(),
    onCameraError: () => setStatus('unavailable'),
    onToggleTorch: () => setTorchOn((on) => !on),
    onRead,
  };
};
