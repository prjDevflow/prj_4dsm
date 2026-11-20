import { useState } from 'react';
import { useToast } from '@/components/ui';
import type { IClipboardService } from '@/service/IDeviceService';

export type IssuedKey = { terminalName: string; apiKey: string };

/**
 * The key of a terminal lives only in this state (T22): not in the query cache, not in a route
 * param, not in a log. When the screen goes away, the key goes with it.
 */
export const useIssuedKey = (clipboardService: IClipboardService) => {
  const toast = useToast();
  const [issuedKey, setIssuedKey] = useState<IssuedKey | null>(null);

  return {
    issuedKey,
    showKey: (key: IssuedKey) => setIssuedKey(key),
    clearKey: () => setIssuedKey(null),
    onCopyKey: async () => {
      if (!issuedKey) return;
      await clipboardService.exec(issuedKey.apiKey);
      toast.show('Chave copiada.');
    },
  };
};
