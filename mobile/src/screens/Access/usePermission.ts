import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { IOpenSettingsService, PermissionAccess } from '@/service/IDeviceService';

export type PermissionStatus = 'checking' | PermissionAccess | 'failed';

type AccessReader = { exec: () => Promise<PermissionAccess> };

type PermissionProps = {
  /** Reads the permission, without showing the system's question. */
  getAccessService: AccessReader;
  /** Shows the system's question. */
  requestAccessService: AccessReader;
  openSettingsService: IOpenSettingsService;
};

// The permission of T06 (camera) and T08 (location): reads it, asks, and follows the way to the
// settings and back.
export const usePermission = ({
  getAccessService,
  requestAccessService,
  openSettingsService,
}: PermissionProps) => {
  const [status, setStatus] = useState<PermissionStatus>('checking');
  const wentToSettings = useRef(false);

  const update = useCallback(async (reader: AccessReader) => {
    try {
      setStatus(await reader.exec());
    } catch {
      setStatus('failed');
    }
  }, []);

  useEffect(() => {
    void update(getAccessService);
    // Expo Go keeps a "no" per project and ignores the settings until the app asks again, so the
    // way back from the settings asks. Only that way: closing the system's question also fires this.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const backFromSettings = wentToSettings.current;
      wentToSettings.current = false;
      void update(backFromSettings ? requestAccessService : getAccessService);
    });

    return () => subscription.remove();
  }, [getAccessService, requestAccessService, update]);

  return {
    status,
    ask: () => update(requestAccessService),
    openSettings: async () => {
      wentToSettings.current = true;
      await openSettingsService.exec();
    },
    markFailed: () => setStatus('failed'),
  };
};
