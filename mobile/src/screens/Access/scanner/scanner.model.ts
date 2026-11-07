import { useCallback, useEffect, useRef, useState } from 'react';
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
  const wentToSettings = useRef(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const askAccess = useCallback(async () => {
    try {
      setStatus(accessStatus[await requestCameraAccessService.exec()]);
    } catch {
      setStatus('unavailable');
    }
  }, [requestCameraAccessService]);

  useEffect(() => {
    const loadAccess = async () => {
      try {
        setStatus(accessStatus[await getCameraAccessService.exec()]);
      } catch {
        setStatus('unavailable');
      }
    };

    void loadAccess();
    // Expo Go keeps a "no" per project and ignores the settings until the app asks again, so the
    // way back from the settings asks. Only that way: closing the system's question also fires this.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (wentToSettings.current) {
        wentToSettings.current = false;
        void askAccess();
      } else {
        void loadAccess();
      }
    });

    return () => {
      subscription.remove();
      clearTimeout(noticeTimer.current);
    };
  }, [getCameraAccessService, askAccess]);

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
    onAllow: askAccess,
    onOpenSettings: async () => {
      wentToSettings.current = true;
      await openSettingsService.exec();
    },
    onCameraError: () => setStatus('unavailable'),
    onToggleTorch: () => setTorchOn((on) => !on),
    onRead,
  };
};
