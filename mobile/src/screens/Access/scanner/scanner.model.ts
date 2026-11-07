import { useEffect, useRef, useState } from 'react';
import { isSystemQr } from '@/lib/qr';
import type {
  IGetCameraAccessService,
  IOpenSettingsService,
  IRequestCameraAccessService,
  IVibrateService,
} from '@/service/IDeviceService';
import { usePermission, type PermissionStatus } from '../usePermission';

export type ScannerStatus = 'checking' | 'ask' | 'denied' | 'ready' | 'unavailable';

const NOTICE_MS = 3_000;

const scannerStatus: Record<PermissionStatus, ScannerStatus> = {
  checking: 'checking',
  granted: 'ready',
  undetermined: 'ask',
  denied: 'denied',
  failed: 'unavailable',
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
  const permission = usePermission({
    getAccessService: getCameraAccessService,
    requestAccessService: requestCameraAccessService,
    openSettingsService,
  });
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const alreadyRead = useRef(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

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
    status: scannerStatus[permission.status],
    noticeVisible,
    torchOn,
    onAllow: permission.ask,
    onOpenSettings: permission.openSettings,
    onCameraError: permission.markFailed,
    onToggleTorch: () => setTorchOn((on) => !on),
    onRead,
  };
};
